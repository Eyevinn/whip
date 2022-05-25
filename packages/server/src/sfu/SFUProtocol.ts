import fetch from 'node-fetch';

const SMB_URL = 'http://localhost:8080/conferences/';

interface SmbCandidate {
    'generation': number;
    'component': number;
    'protocol': string;
    'port': number;
    'ip': string;
    'relPort'?: number;
    'relAddr'?: string;
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

export class SFUProtocol {
    async allocateConference(): Promise<string> {
        const allocateResponse = await fetch(SMB_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: '{}'
        });

        if (!allocateResponse.ok) {
            return;
        }

        const allocateResponseJson = await allocateResponse.json();
        return Promise.resolve(allocateResponseJson['id']);
    }

    async allocateEndpoint(conferenceId: string,
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

        const url = SMB_URL + conferenceId + '/' + endpointId;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            return Promise.reject();
        }

        return <SmbEndpointDescription>(await response.json());
    }

    async configureEndpoint(conferenceId: string, endpointId: string, endpointDescription: SmbEndpointDescription): Promise<void> {
        let request = JSON.parse(JSON.stringify(endpointDescription));
        request["action"] = "configure";

        const url = SMB_URL + conferenceId + '/' + endpointId;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            return Promise.reject();
        }
    }
}
