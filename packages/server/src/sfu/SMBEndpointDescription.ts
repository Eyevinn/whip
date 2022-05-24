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

interface PayloadParameter {
    'name': string;
    'value': string;
}

interface SmbPayloadType {
    'id': number;
    'name': string;
    'clockrate': number;
    'channels'?: number;
    'parameters'?: PayloadParameter[];
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
