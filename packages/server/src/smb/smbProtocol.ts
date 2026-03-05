import nodeFetch from 'node-fetch';

type FetchFn = typeof nodeFetch;

// Resolve fetch at call-time so tests can override via globalThis.fetch.
// Falls back to node-fetch for environments without native fetch (Node < 18).
function fetch(...args: Parameters<FetchFn>): ReturnType<FetchFn> {
  const impl: FetchFn = ((globalThis as unknown) as { fetch?: FetchFn }).fetch ?? nodeFetch;
  return impl(...args);
}
import { ISmbProtocol } from './ISmbProtocol';

interface SmbCandidate {
  'generation': number;
  'component': number;
  'protocol': string;
  'port': number;
  'ip': string;
  'rel-port'?: number;
  'rel-addr'?: string;
  'foundation': string;
  'priority': number;
  'type': string;
  'network'?: number;
}

interface SmbTransport {
  'rtcp-mux'?: boolean;
  'ice'?: {
    'ufrag': string;
    'pwd': string;
    'candidates': SmbCandidate[];
  };
  'dtls'?: {
    'setup': string;
    'type': string;
    'hash': string;
  };
}

interface RtcpFeedback {
  'type': string;
  'subtype': string;
}

interface SmbPayloadType {
  'id': number;
  'name': string;
  'clockrate': number;
  'channels'?: number;
  'parameters'?: Record<string, unknown>;
  'rtcp-fbs'?: RtcpFeedback[];
}

interface SmbRtpHeaderExtension {
  'id': number;
  'uri': string;
}

export interface SmbEndpoint {
  id: string;
  iceState?: string;
  [key: string]: unknown;
}

export interface SmbVideoSource {
  'main': number;
  'feedback'?: number;
}

export interface SmbVideoStream {
  'sources': SmbVideoSource[];
  'id': string;
  'content': string;
}

export interface SmbEndpointDescription {
  'bundle-transport'?: SmbTransport;
  'audio'?: {
    'ssrcs': number[];
    'payload-type': SmbPayloadType;
    'rtp-hdrexts': SmbRtpHeaderExtension[];
  };

  'video'?: {
    'streams': SmbVideoStream[];
    'payload-types': SmbPayloadType[];
    'rtp-hdrexts'?: SmbRtpHeaderExtension[];
  };

  'data'?: {
    'port': number;
  };
}

function isTransientError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000, 8000, 16000];
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < delays.length && isTransientError(lastError)) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}

export class SmbProtocol implements ISmbProtocol {
  private apiKey: string | undefined;

  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey;
  }

  private get authHeaders(): Record<string, string> {
    return {
      ...(this.apiKey && { 'X-APIkey': this.apiKey }),
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };
  }

  async allocateConference(smbUrl: string): Promise<string> {
    return withRetry(async () => {
      const allocateResponse = await fetch(smbUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        },
        body: '{}'
      });

      if (!allocateResponse.ok) {
        throw new Error(`Failed to allocate resource (${allocateResponse.status}): ` + JSON.stringify(allocateResponse));
      }

      const allocateResponseJson = await allocateResponse.json();
      return allocateResponseJson['id'];
    });
  }

  async allocateEndpoint(
    smbUrl: string,
    conferenceId: string,
    endpointId: string,
    audio: boolean,
    video: boolean,
    data: boolean
  ): Promise<SmbEndpointDescription> {
    return withRetry(async () => {
      const request: Record<string, unknown> = {
        'action': 'allocate',
        'bundle-transport': {
          'ice-controlling': true,
          'ice': true,
          'dtls': true
        }
      };

      if (audio) {
        request['audio'] = { 'relay-type': 'forwarder' };
      }
      if (video) {
        request['video'] = { 'relay-type': 'forwarder' };
      }
      if (data) {
        request['data'] = {};
      }

      const url = smbUrl + conferenceId + '/' + endpointId;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to allocate endpoint (${response.status}): ` + JSON.stringify(request));
      }

      const smbEndpointDescription: SmbEndpointDescription = (await response.json());
      return smbEndpointDescription;
    });
  }

  async configureEndpoint(
    smbUrl: string,
    conferenceId: string,
    endpointId: string,
    endpointDescription: SmbEndpointDescription
  ): Promise<void> {
    return withRetry(async () => {
      const request = JSON.parse(JSON.stringify(endpointDescription));
      request['action'] = 'configure';

      const url = smbUrl + conferenceId + '/' + endpointId;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const responseJson = await response.json();
        throw new Error('Failed to configure endpoint: ' + responseJson.message);
      }
    });
  }

  async getConferences(smbUrl: string): Promise<string[]> {
    const response = await fetch(smbUrl, {
      method: 'GET',
      headers: {
        ...this.authHeaders
      }
    });

    if (!response.ok) {
      return [];
    }

    const responseBody: string[] = await response.json();
    return responseBody;
  }

  async getEndpoints(smbUrl: string, conferenceId: string): Promise<SmbEndpoint[]> {
    return withRetry(async () => {
      const response = await fetch(smbUrl + conferenceId, {
        method: 'GET',
        headers: {
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get endpoints (${response.status})`);
      }

      const responseBody: SmbEndpoint[] = await response.json();
      return responseBody;
    });
  }

  async deleteEndpoint(smbUrl: string, conferenceId: string, endpointId: string): Promise<boolean> {
    return withRetry(async () => {
      const response = await fetch(smbUrl + conferenceId + '/' + endpointId, {
        method: 'DELETE',
        headers: {
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete endpoint (${response.status})`);
      }

      return response.ok;
    });
  }
}
