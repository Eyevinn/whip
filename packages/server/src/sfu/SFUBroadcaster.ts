import { Broadcaster } from "../broadcaster";
import { WHIPResource, WHIPResourceICEServer } from "../models/WHIPResource";
import { parse, write } from 'sdp-transform'
import { v4 as uuidv4 } from "uuid";
import fetch from 'node-fetch';
import { SmbEndpointDescription } from "./SMBEndpointDescription";

const SMB_URL = 'http://localhost:8080/conferences/';

export class SFUBroadcaster implements WHIPResource {
    private resourceId: string;
    private broadcaster: Broadcaster | undefined = undefined;
    private conferenceId: string | undefined = undefined;
    private offer: string;
    private answer: string | undefined = undefined;

    constructor(sdpOffer: string, channelId?: string) {
        this.resourceId = uuidv4();
        this.offer = sdpOffer;
    }

    async connect() {
        await this.setupSfu(this.offer);
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

    private async allocateChannel(): Promise<SmbEndpointDescription> {
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
            return Promise.reject();
        }

        const endpointDescription = <SmbEndpointDescription>(await response.json());
        return Promise.resolve(endpointDescription);
    }

    private async patchChannel(endpointDescription: SmbEndpointDescription) {
        const request = endpointDescription;
        request['action'] = 'configure';

        console.log('patchChannel:' + JSON.stringify(request));

        const url = SMB_URL + this.conferenceId + '/ingest';
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw 'patchChannel error';
        }
    }

    private createAnswer(endpointDescription: SmbEndpointDescription) {
        const parsedSDP = parse(this.offer);
        console.log(JSON.stringify(parsedSDP));

        parsedSDP.origin.sessionVersion++;
        parsedSDP['extmapAllowMixed'] = undefined;

        let nextMid = 0;
        let bundleGroupMids = '';

        for (let media of parsedSDP.media) {
            media.mid = `${nextMid}`;
            bundleGroupMids = bundleGroupMids === '' ? `${media.mid}` : `${bundleGroupMids} ${media.mid}`
            nextMid++;

            media.rtcpRsize = undefined;
            media['iceOptions'] = undefined;
            media.iceUfrag = endpointDescription['bundle-transport'].ice.ufrag;
            media.icePwd = endpointDescription['bundle-transport'].ice.pwd;
            media.fingerprint.type = endpointDescription["bundle-transport"].dtls.type;
            media.fingerprint.hash = endpointDescription["bundle-transport"].dtls.hash;
            media.setup = media.setup === 'actpass' ? 'active' : 'actpass';
            media.ssrcGroups = undefined;
            media.ssrcs = undefined;
            media.msid = undefined;

            media.candidates = [];
            for (let candidate of endpointDescription["bundle-transport"].ice.candidates) {
                media.candidates.push({
                    foundation: candidate.foundation,
                    component: candidate.component,
                    transport: candidate.protocol,
                    priority: candidate.priority,
                    ip: candidate.ip,
                    port: candidate.port,
                    type: candidate.type,
                    raddr: candidate.relAddr,
                    rport: candidate.relPort,
                    generation: candidate.generation,
                    'network-id': candidate.network
                });
            }

            if (media.type === 'audio') {
                media.rtp = media.rtp.filter(rtp => rtp.codec === 'opus');
                let opusPayloadType = media.rtp.at(0).payload;

                media.fmtp = media.fmtp.filter(fmtp => fmtp.payload === opusPayloadType);
                media.payloads = `${opusPayloadType}`;

                media.ext = media.ext.filter(ext => ext.uri === 'urn:ietf:params:rtp-hdrext:ssrc-audio-level' || 
                    ext.uri === 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time');

                media.direction = 'recvonly';
                media.rtcpFb = undefined;

            } else if (media.type === 'video') {
                media.rtp = media.rtp.filter(rtp => rtp.codec === 'VP8' || rtp.codec === 'rtx');
                let vp8PayloadType = media.rtp.at(0).payload;
                let vp8RtxPayloadType = media.rtp.at(1).payload;

                media.rtp = media.rtp.filter(rtp => rtp.payload === vp8PayloadType || rtp.payload === vp8RtxPayloadType);

                media.fmtp = media.fmtp.filter(fmtp => fmtp.payload === vp8PayloadType || fmtp.payload === vp8RtxPayloadType);
                media.payloads = `${vp8PayloadType} ${vp8RtxPayloadType}`;
                media.setup = 'active';

                media.ext = media.ext.filter(ext => ext.uri === 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time' ||
                    ext.uri === 'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id');

                media.direction = 'recvonly';
                media.rtcpFb = media.rtcpFb.filter(rtcpFb => rtcpFb.payload === vp8PayloadType && 
                    (rtcpFb.type === 'goog-remb' || rtcpFb.type === 'nack'));

                media.ssrcGroups = undefined;
            }
        }

        parsedSDP.groups = [{
            type: 'BUNDLE',
            mids: bundleGroupMids
        }];

        console.log(JSON.stringify(parsedSDP));
        this.answer = write(parsedSDP);
        console.log(this.answer);
    }

    private async setupSfu(sdpOffer: string) {
        await this.allocateConference();
        const endpointDescription = await this.allocateChannel();
        console.log('allocateChannelResponse: ' + JSON.stringify(endpointDescription));
        this.createAnswer(endpointDescription);

        const parsedOffer = parse(this.offer);

        // Add information from the WHIP client offer to the SFU endpoint description
        endpointDescription["bundle-transport"].dtls.setup = parsedOffer.media[0].setup;
        endpointDescription["bundle-transport"].dtls.type = parsedOffer.media[0].fingerprint.type;
        endpointDescription["bundle-transport"].dtls.hash = parsedOffer.media[0].fingerprint.hash;
        endpointDescription["bundle-transport"].ice.ufrag = parsedOffer.media[0].iceUfrag;
        endpointDescription["bundle-transport"].ice.pwd = parsedOffer.media[0].icePwd;
        endpointDescription["bundle-transport"].ice.candidates = [];

        for (let media of parsedOffer.media) {
            if (media.type === 'audio') {
                endpointDescription.audio.ssrcs = [];
                media.ssrcs.filter(ssrc => ssrc.attribute === 'msid')
                    .forEach(ssrc => endpointDescription.audio.ssrcs.push(`${ssrc.id}`));

            } else if (media.type === 'video') {
                endpointDescription.video.ssrcs = [];
                media.ssrcs.filter(ssrc => ssrc.attribute === 'msid')
                    .forEach(ssrc => endpointDescription.video.ssrcs.push(`${ssrc.id}`));

                endpointDescription.video["ssrc-groups"] = [];
                for (let mediaSsrcGroup of media.ssrcGroups) {
                    const ssrcsSplit = mediaSsrcGroup.ssrcs.split(' ');

                    endpointDescription.video["ssrc-groups"].push({
                        ssrcs: ssrcsSplit,
                        semantics: mediaSsrcGroup.semantics
                    });
                }
            }
        }

        // Add information from the negotiated answer to the SFU endpoint description
        const parsedAnswer = parse(this.answer);
        for (let media of parsedAnswer.media) {
            if (media.type === 'audio') {
                endpointDescription.audio["payload-type"].id = media.rtp[0].payload;
                endpointDescription.audio["rtp-hdrexts"] = [];
                for (let ext of media.ext) {
                    endpointDescription.audio["rtp-hdrexts"].push({id: ext.value, uri: ext.uri});
                }

            } else if (media.type === 'video') {
                endpointDescription.video["payload-types"][0].id = media.rtp[0].payload;
                endpointDescription.video["payload-types"][1].id = media.rtp[1].payload;
                endpointDescription.video["payload-types"][1].parameters[0].name = 'apt';
                endpointDescription.video["payload-types"][1].parameters[0].value = `${media.rtp[0].payload}`;
                
                endpointDescription.video["rtp-hdrexts"] = [];
                for (let ext of media.ext) {
                    endpointDescription.video["rtp-hdrexts"].push({id: ext.value, uri: ext.uri});
                }

                let payloadType = endpointDescription.video["payload-types"][0];
                payloadType["rtcp-fbs"] = [];
                for (let rtcpFb of media.rtcpFb) {
                    payloadType["rtcp-fbs"].push({
                        type: rtcpFb.type,
                        subtype: rtcpFb.subtype
                    });
                }
            }
        }

        console.log(JSON.stringify(endpointDescription));
        await this.patchChannel(endpointDescription);
    }

    getProtocolExtensions(): string[] {
        return [];
    }

    sdpAnswer(): Promise<string> {
        if (!this.answer) {
            return Promise.reject();
        }

        return Promise.resolve(this.answer);
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

    patch(body: string, eTag?: string): Promise<number> {
        return Promise.resolve(405);
    }

    destroy() {
    }
}
