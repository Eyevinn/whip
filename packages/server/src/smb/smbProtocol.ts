import fetch from 'node-fetch';

const apiKey: string | undefined = process.env.SFU_API_KEY ? process.env.SFU_API_KEY : undefined;

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

interface SmbSsrcAttribute {
  'sources': number[];
  'content': string;
}

interface SmbSsrcGroup {
  'ssrcs': string[];
  'semantics': string;
}

export interface SmbEndpointDescription {
  'bundle-transport'?: SmbTransport;
  'audio'?: {
    'ssrcs': string[];
    'payload-type': SmbPayloadType;
    'rtp-hdrexts': SmbRtpHeaderExtension[];
  };

  'video'?: {
    'ssrcs': string[];
    'ssrc-groups': SmbSsrcGroup[];
    'payload-types': SmbPayloadType[];
    'rtp-hdrexts'?: SmbRtpHeaderExtension[];
    'ssrc-attributes'?: SmbSsrcAttribute[];
  };

  'data'?: {
    'port': number;
  };
}

export class SmbProtocol {
  async allocateConference(smbUrl: string): Promise<string> {
    const allocateResponse = await fetch(smbUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APIkey": apiKey
      },
      body: '{}'
    });

    if (!allocateResponse.ok) {
      throw new Error("Failed to allocate resource");
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
        "X-APIkey": apiKey
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
        "X-APIkey": apiKey
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
        "X-APIkey": apiKey
      }
    });

    if (!response.ok) {
      return [];
    }

    const responseBody: string[] = await response.json();
    return responseBody;
  }
}
