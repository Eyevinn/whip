import { Broadcaster } from "../broadcaster";
import { WHIPResource, WHIPResourceICEServer } from "../models/WHIPResource";
import { SessionDescription, parse, write } from 'sdp-transform'
import { v4 as uuidv4 } from "uuid";
import fetch from 'node-fetch';

const SMB_URL = 'http://localhost:8080/conferences/';

export class SFUBroadcaster implements WHIPResource {
    private resourceId: string;
    private broadcaster: Broadcaster | undefined = undefined;
    private conferenceId: string | undefined = undefined;

    constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[], channelId?: string) {
        this.resourceId = uuidv4();
        this.setupSfu(sdpOffer);
    }

    private async allocateConference() {
        const url = SMB_URL;
        const allocateResponse = await fetch(url, {
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
        this.conferenceId = allocateResponseJson['id'];
        console.log(`id: ${this.conferenceId}`);
    }

    private async allocateChannel(): Promise<Response> {
        const request = {
            "action": "allocate",
            "bundle-transport": {
                "ice-controlling": true,
                "ice": true,
                "dtls": true
            },
            "audio": {
                "relay-type": "forwarder"
            },
            "video": {
                "relay-type": "forwarder"
            },
            "data": {
            }
        }

        console.log(JSON.stringify(request));

        const url = SMB_URL + this.conferenceId + '/ingest';
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            return;
        }

        const responseJson = await response.json();
        console.log(JSON.stringify(responseJson));
    }

    private async setupSfu(sdpOffer: string) {
        await this.allocateConference();
        const allocateChannelResponse = await this.allocateChannel();

        const parsedSDP = parse(sdpOffer);

        console.log(JSON.stringify(parsedSDP));

        parsedSDP['extmapAllowMixed'] = undefined;
        parsedSDP.msidSemantic = undefined;

        for (let media of parsedSDP.media) {
            if (media.type === 'audio') {
                media.rtp = media.rtp.filter(rtp => rtp.codec === 'opus');
                let opusPayloadType = media.rtp.at(0).payload;

                media.fmtp = media.fmtp.filter(fmtp => fmtp.payload === opusPayloadType);
                media.payloads = `${opusPayloadType}`;
                media.setup = 'active';

                media.ext = media.ext.filter(ext => ext.uri === 'urn:ietf:params:rtp-hdrext:ssrc-audio-level' || 
                    ext.uri === 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time');

                media.direction = 'recvonly';
                media.msid = undefined;
                media.rtcpFb = undefined;
                media.ssrcs = undefined;
                media.rtcpRsize = undefined;
                media['iceOptions'] = undefined;

            } else if (media.type === 'video') {
                media.rtp = media.rtp.filter(rtp => rtp.codec === 'VP8' || rtp.codec === 'rtx');
                let vp8PayloadType = media.rtp.at(0).payload;
                let vp8RtxPayloadType = media.rtp.at(1).payload;

                media.rtp = media.rtp.filter(rtp => rtp.payload === vp8PayloadType || rtp.payload === vp8RtxPayloadType);

                media.fmtp = media.fmtp.filter(fmtp => fmtp.payload === vp8PayloadType || fmtp.payload === vp8RtxPayloadType);
                media.payloads = `${vp8PayloadType} ${vp8RtxPayloadType}`;
                media.setup = 'active';

                media.ext = media.ext.filter(ext => ext.uri === 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time');

                media.direction = 'recvonly';
                media.msid = undefined;
                media.rtcpFb = media.rtcpFb.filter(rtcpFb => rtcpFb.payload === vp8PayloadType && 
                    (rtcpFb.type === 'goog-remb' || rtcpFb.type === 'nack'));
                media.ssrcs = undefined;
                media.ssrcGroups = undefined;
                media.rtcpRsize = undefined;
                media['iceOptions'] = undefined;
            }
        }

        console.log(JSON.stringify(parsedSDP));
    }

    getProtocolExtensions(): string[] {
        return [];
    }

    sdpAnswer(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    assignBroadcaster(broadcaster: Broadcaster) {
        this.broadcaster = broadcaster;
    }

    getIceServers(): WHIPResourceICEServer[] {
        return [];
    }

    getId(): string {
        return this.resourceId;
    }

    getType(): string {
        return "sfu-broadcaster";
    }

    patch(body: string): Promise<number> {
        return Promise.resolve(405);
    }

    destroy() {
    }
}
