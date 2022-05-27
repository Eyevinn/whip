import { Broadcaster } from "../broadcaster";
import { WHIPResource, WHIPResourceICEServer, IANA_PREFIX, WHIPResourceMediaStreams, WHIPResourceSsrc, WHIPResourceSsrcGroup } from "../models/WHIPResource";
import { parse, SessionDescription, write } from 'sdp-transform'
import { v4 as uuidv4 } from "uuid";
import { SmbEndpointDescription, SFUProtocol } from "./SFUProtocol";
import { clearTimeout } from "timers";

export class SFUBroadcaster implements WHIPResource {
    private resourceId: string;
    private broadcaster?: Broadcaster = undefined;
    private sfuResourceId?: string = undefined;
    private offer: string;
    private answer?: string = undefined;
    private channelId?: string = undefined;
    private eTag: string;
    private mediaStreams: WHIPResourceMediaStreams;
    private sfuProtocol: SFUProtocol = new SFUProtocol();
    private channelHealthTimeout?: NodeJS.Timeout;

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
        await this.setupSfu();
        this.broadcaster.createChannel(this.channelId, undefined, this.sfuResourceId, this.mediaStreams);
        this.checkChannelHealth();
    }

    private async checkChannelHealth() {
        try {
            const result = await this.sfuProtocol.getConferences();
            if (result.find(element => element === this.sfuResourceId) === undefined) {
                console.log(`SFU resource does not exist, deleting channel ${this.channelId}`);
                this.broadcaster.removeChannel(this.channelId);
                return;
            }
        } catch (error) {
            console.log(`SFU not responding, deleting channel ${this.channelId}`);
            this.broadcaster.removeChannel(this.channelId);
            return;
        }

        console.log('Channel SFU resource healthy');
        this.channelHealthTimeout = setTimeout(() => {
            this.checkChannelHealth();
        }, 10000);
    }

    private createAnswer(endpointDescription: SmbEndpointDescription) {
        const parsedSDP = parse(this.offer);

        parsedSDP.origin.sessionVersion++;
        parsedSDP['extmapAllowMixed'] = undefined;

        let nextMid = 0;
        let bundleGroupMids = '';

        const transport = endpointDescription['bundle-transport'];

        for (let media of parsedSDP.media) {
            media.mid = `${nextMid}`;
            bundleGroupMids = bundleGroupMids === '' ? `${media.mid}` : `${bundleGroupMids} ${media.mid}`
            nextMid++;

            media.rtcpRsize = undefined;
            media['iceOptions'] = undefined;
            media.iceUfrag = transport.ice.ufrag;
            media.icePwd = transport.ice.pwd;
            media.fingerprint.type = transport.dtls.type;
            media.fingerprint.hash = transport.dtls.hash;
            media.setup = media.setup === 'actpass' ? 'active' : 'actpass';
            media.ssrcGroups = undefined;
            media.ssrcs = undefined;
            media.msid = undefined;

            media.candidates = transport.ice.candidates.flatMap(candidate => {
                return {
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
                };
            });

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

    private async setupSfu() {
        this.sfuResourceId = await this.sfuProtocol.allocateConference();

        const parsedOffer = parse(this.offer);
        const endpointDescription = await this.sfuProtocol.allocateEndpoint(
            this.sfuResourceId,
            'ingest',
            parsedOffer.media.find(element => element.type === 'audio') !== undefined,
            parsedOffer.media.find(element => element.type === 'video') !== undefined,
            parsedOffer.media.find(element => element.type === 'application') !== undefined);

        this.createAnswer(endpointDescription);

        // Add information from the WHIP client offer to the SFU endpoint description
        const transport = endpointDescription['bundle-transport'];
        const offerMediaDescription = parsedOffer.media[0];
        transport.dtls.setup = offerMediaDescription.setup;
        transport.dtls.type = offerMediaDescription.fingerprint.type;
        transport.dtls.hash = offerMediaDescription.fingerprint.hash;
        transport.ice.ufrag = offerMediaDescription.iceUfrag;
        transport.ice.pwd = offerMediaDescription.icePwd;
        transport.ice.candidates = [];

        for (let media of parsedOffer.media) {
            if (media.type === 'audio') {
                endpointDescription.audio.ssrcs = [];
                media.ssrcs.filter(ssrc => ssrc.attribute === 'msid')
                    .forEach(ssrc => endpointDescription.audio.ssrcs.push(`${ssrc.id}`));

            } else if (media.type === 'video') {
                endpointDescription.video.ssrcs = [];
                media.ssrcs.filter(ssrc => ssrc.attribute === 'msid')
                    .forEach(ssrc => endpointDescription.video.ssrcs.push(`${ssrc.id}`));

                endpointDescription.video["ssrc-groups"] = media.ssrcGroups.flatMap(mediaSsrcGroup => {
                    return {
                        ssrcs: mediaSsrcGroup.ssrcs.split(' '),
                        semantics: mediaSsrcGroup.semantics
                    };
                });
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
                endpointDescription.video["payload-types"][1].parameters = { 'apt': media.rtp[0].payload.toString() };

                endpointDescription.video["rtp-hdrexts"] = media.ext.flatMap(ext => {
                    return { id: ext.value, uri: ext.uri };
                });

                endpointDescription.video["payload-types"].forEach(payloadType => {
                    const rtcpFbs = media.rtcpFb.filter(element => element.payload === payloadType.id);
                    payloadType["rtcp-fbs"] = rtcpFbs.flatMap(rtcpFb => {
                        return {
                            type: rtcpFb.type,
                            subtype: rtcpFb.subtype
                        };
                    });
                });
            }
        }

        this.extractMediaStreams(parsedOffer);
        await this.sfuProtocol.configureEndpoint(this.sfuResourceId, 'ingest', endpointDescription);
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
                    mediaStreams.get(ssrcString) : <WHIPResourceSsrc>{ ssrc: ssrcString };

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

            this.mediaStreams.video.ssrcGroups = media.ssrcGroups && media.ssrcGroups.flatMap(ssrcGroup => {
                return {
                    semantics: ssrcGroup.semantics,
                    ssrcs: ssrcGroup.ssrcs.split(' ')
                };
            });
        }

        audioMediaStreams.forEach(value => this.mediaStreams.audio.ssrcs.push(value));
        videoMediaStreams.forEach(value => this.mediaStreams.video.ssrcs.push(value));
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
        if (this.channelHealthTimeout) {
            clearTimeout(this.channelHealthTimeout);
        }
    }
}
