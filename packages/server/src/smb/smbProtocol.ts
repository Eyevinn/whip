import fetch from 'node-fetch';

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
  'parameters'?: any;
  'rtcp-fbs'?: RtcpFeedback[];
}

interface SmbRtpHeaderExtension {
  'id': number;
  'uri': string;
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

export class SmbProtocol {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async allocateConference(smbUrl: string): Promise<string> {
    const allocateResponse = await fetch(smbUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APIkey": this.apiKey,
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` })
      },
      body: '{}'
    });

    if (!allocateResponse.ok) {
      console.log(allocateResponse);
      throw new Error(`Failed to allocate resource (${allocateResponse.status}): ` + JSON.stringify(allocateResponse));
    }

    const allocateResponseJson = await allocateResponse.json();
    return allocateResponseJson['id'];
  }

  async allocateEndpoint(smbUrl: string,
    conferenceId: string,
    endpointId: string,
    audio: boolean,
    video: boolean,
    data: boolean): Promise<SmbEndpointDescription> {

    let request = {
      "action": "allocate",
      "bundle-transport": {
        "ice-controlling": true,
        "ice": true,
        "dtls": true
      }
    }

    if (audio) {
      request["audio"] = { "relay-type": "forwarder" };
    }
    if (video) {
      request["video"] = { "relay-type": "forwarder" };
    }
    if (data) {
      request["data"] = {};
    }

    const url = smbUrl + conferenceId + '/' + endpointId;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APIkey": this.apiKey,
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      console.log(JSON.stringify(request));
      throw new Error("Failed to allocate endpoint");
    }

    const smbEndpointDescription: SmbEndpointDescription = (await response.json());
    return smbEndpointDescription;
  }

  async configureEndpoint(smbUrl: string, conferenceId: string, endpointId: string, endpointDescription: SmbEndpointDescription): Promise<void> {
    let request = JSON.parse(JSON.stringify(endpointDescription));
    request["action"] = "configure";

    const url = smbUrl + conferenceId + '/' + endpointId;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APIkey": this.apiKey,
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      console.log(JSON.stringify(request));
      throw new Error("Failed to configure endpoint");
    }
  }

  async getConferences(smbUrl: string): Promise<string[]> {
    const response = await fetch(smbUrl, {
      method: "GET",
      headers: {
        "X-APIkey": this.apiKey,
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` })
      }
    });

    if (!response.ok) {
      return [];
    }

    const responseBody: string[] = await response.json();
    return responseBody;
  }

  async getEndpoints(smbUrl: string, conferenceId: string): Promise<string[]> {
    const response = await fetch(smbUrl + conferenceId, {
      method: "GET",
      headers: {
        "X-APIkey": this.apiKey,
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` })
      }
    });

    if (!response.ok) {
      return [];
    }

    const responseBody: string[] = await response.json();
    return responseBody;
  }

  async deleteEndpoint(smbUrl: string, conferenceId: string, endpointId: string): Promise<boolean> {
    const response = await fetch(smbUrl + conferenceId + '/' + endpointId, {
      method: "DELETE",
      headers: {
        "X-APIkey": this.apiKey,
        ...(this.apiKey && { "Authorization": `Bearer ${this.apiKey}` })
      }
    });
    return response.ok;
  }
}
