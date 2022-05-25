import { Broadcaster } from "../broadcaster";
import { WHIPResource, WHIPResourceICEServer, IANA_PREFIX, WHIPResourceMediaStreams, WHIPResourceSsrc, WHIPResourceSsrcGroup } from "../models/WHIPResource";
import { parse, SessionDescription, write } from 'sdp-transform'
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
    private channelId: string | undefined = undefined;
    private eTag: string;
    private mediaStreams: WHIPResourceMediaStreams;

    constructor(sdpOffer: string, channelId?: string) {
        this.resourceId = uuidv4();
        this.offer = sdpOffer;
        this.channelId = channelId ? channelId : this.getId();
        this.eTag = uuidv4();

        this.mediaStreams = {
            audio: {
                ssrcs: []
            },
            video: {
                ssrcs: [],
                ssrcGroups: []
            }
        };
    }

    async connect() {
        await this.setupSfu(this.offer);
        this.broadcaster.createChannel(this.channelId, undefined, this.conferenceId, this.mediaStreams);
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
        console.log(`sfuResourceId: ${this.conferenceId}`);
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

        this.answer = write(parsedSDP);
    }

    private async setupSfu(sdpOffer: string) {
        await this.allocateConference();
        const endpointDescription = await this.allocateChannel();
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
                    endpointDescription.audio["rtp-hdrexts"].push({ id: ext.value, uri: ext.uri });
                }

            } else if (media.type === 'video') {
                endpointDescription.video["payload-types"][0].id = media.rtp[0].payload;
                endpointDescription.video["payload-types"][1].id = media.rtp[1].payload;
                endpointDescription.video["payload-types"][1].parameters[0].name = 'apt';
                endpointDescription.video["payload-types"][1].parameters[0].value = `${media.rtp[0].payload}`;

                endpointDescription.video["rtp-hdrexts"] = [];
                for (let ext of media.ext) {
                    endpointDescription.video["rtp-hdrexts"].push({ id: ext.value, uri: ext.uri });
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

        this.extractMediaStreams(parsedOffer);

        await this.patchChannel(endpointDescription);
    }

    // Extract media stream information from the WHIP client offer
    private extractMediaStreams(parsedOffer: SessionDescription) {
        let audioMediaStreams = new Map<string, WHIPResourceSsrc>();
        let videoMediaStreams = new Map<string, WHIPResourceSsrc>();

        for (let media of parsedOffer.media) {
            if (media.type !== 'audio' && media.type !== 'video') {
                continue;
            }

            let mediaStreams = media.type === 'audio' ? audioMediaStreams : videoMediaStreams;
            media.ssrcs.forEach(ssrc => {
                const ssrcString = ssrc.id.toString();

                let resourceSsrc = mediaStreams.has(ssrcString) ? 
                mediaStreams.get(ssrcString) : <WHIPResourceSsrc>{ssrc: ssrcString};
                
                switch (ssrc.attribute) {
                    case 'label':
                        resourceSsrc.label = ssrc.value;
                        break;
                    case 'mslabel':
                        resourceSsrc.mslabel = ssrc.value;
                        break;
                    case 'cname':
                        resourceSsrc.cname = ssrc.value;
                        break;
                }

                mediaStreams.set(ssrcString, resourceSsrc);
            });

            media.ssrcGroups && media.ssrcGroups.forEach(ssrcGroup => {
                let resourceSsrcGroup = <WHIPResourceSsrcGroup>{
                    semantics: ssrcGroup.semantics,
                    ssrcs: []
                }
                ssrcGroup.ssrcs.split(' ').forEach(element => resourceSsrcGroup.ssrcs.push(element));
                this.mediaStreams.video.ssrcGroups.push(resourceSsrcGroup);
                console.log(`video ssrc group: ${resourceSsrcGroup.semantics} ${JSON.stringify(resourceSsrcGroup.ssrcs)})`);
            });
        }

        for (let key of audioMediaStreams.keys()) {
            const value = audioMediaStreams.get(key);
            console.log(`audio ssrc: ${key} ${JSON.stringify(value)})`);
            this.mediaStreams.audio.ssrcs.push(value);
        }

        for (let key of videoMediaStreams.keys()) {
            const value = videoMediaStreams.get(key);
            console.log(`video ssrc: ${key} ${JSON.stringify(value)})`);
            this.mediaStreams.video.ssrcs.push(value);
        }
    }

    getProtocolExtensions(): string[] {
        const linkTypes = this.broadcaster.getLinkTypes(IANA_PREFIX);
        return [
            `<${this.broadcaster.getBaseUrl()}/channel>;rel=${linkTypes.list}`,
            `<${this.broadcaster.getBaseUrl()}/channel/${this.channelId}>;rel=${linkTypes.channel}`,
            `<${this.broadcaster.getBaseUrl()}/mpd/${this.channelId}>;rel=${linkTypes.mpd}`,
        ]
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

    getETag(): string | undefined {
        return this.eTag;
    }

    getType(): string {
        return "sfu-broadcaster";
    }

    patch(body: string, eTag?: string): Promise<number> {
        return Promise.resolve(405);
    }

    getMediaStreams(): WHIPResourceMediaStreams {
        return this.mediaStreams;
    }

    destroy() {
    }
}
