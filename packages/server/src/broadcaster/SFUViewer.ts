import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";
import { ViewerAnswerRequest, ViewerCandidateRequest, ViewerMediaStream, ViewerOfferResponse } from './ViewerRequests'
import { Viewer } from './Viewer'
import { SmbEndpointDescription } from "../sfu/SMBEndpointDescription";
import { WHIPResourceMediaStreams } from "../models/WHIPResource";
import fetch from 'node-fetch';
import { SessionDescription, write, parse } from "sdp-transform";

const CONNECTION_TIMEOUT = 60 * 1000;
const SMB_URL = 'http://localhost:8080/conferences/';

export class SFUViewer extends EventEmitter implements Viewer {
    private channelId: string;
    private sfuResourceId: string;
    private viewerId: string;
    private connectionTimeout: any;
    private mediaStreams?: WHIPResourceMediaStreams;
    private nextMid: number = 0;
    private usedMids: string[] = [];
    private endpointDescription?: SmbEndpointDescription = undefined;

    constructor(channelId: string, sfuResourceId: string, mediaStreams?: WHIPResourceMediaStreams) {
        super();
        this.channelId = channelId;
        this.sfuResourceId = sfuResourceId;
        this.viewerId = uuidv4();
        this.mediaStreams = mediaStreams;
        this.log(`Create, channelId ${channelId}, sfuResourceId ${sfuResourceId}, audio ${this.mediaStreams?.audio.ssrcs.length}, video ${this.mediaStreams?.video.ssrcs.length}`);
    }

    private log(...args: any[]) {
        console.log(`SFUViewer ${this.viewerId}`, ...args);
    }

    private error(...args: any[]) {
        console.error(`SFUViewer ${this.viewerId}`, ...args);
    }

    getId(): string {
        return this.viewerId;
    }

    private async allocateChannel() {
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

        const url = SMB_URL + this.sfuResourceId + '/' + this.viewerId;
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

        this.endpointDescription = <SmbEndpointDescription>(await response.json());
    }

    async handlePost(stream?: MediaStream): Promise<ViewerOfferResponse> {
        if (stream) {
            throw 'MediaStream should be undefined with SFUViewer';
        }

        await this.allocateChannel();
        this.log(`handlePost response: ${JSON.stringify(this.endpointDescription)}`);
        let offer = this.createOffer();
        this.log(JSON.stringify(offer));
        this.log(write(offer));

        this.emit("connect");
        return Promise.resolve({
            offer: write(offer),
            mediaStreams: this.mediaStreams.video.ssrcs.flatMap(element => {
                return {streamId: element.mslabel};
            })
        });
    }

    private createOffer(): SessionDescription {
        let offer: SessionDescription = {
            version: 0,
            origin: {
                "username": "-",
                "sessionId": "2438602337097565327",
                "sessionVersion": 2,
                "netType": "IN",
                "ipVer": 4,
                "address": "127.0.0.1"
            },
            name: "-",
            timing: {
                "start": 0,
                "stop": 0
            },
            media: []
        };

        this.addSFUMids(offer);
        this.addIngestMids(offer);

        offer.msidSemantic = {
            semantic: 'WMS',
            token: `feedbackvideomslabel ${this.mediaStreams.audio.ssrcs[0].mslabel}`
        }
        offer.groups = [{
            type: 'BUNDLE', 
            mids: this.usedMids.join(' ')
        }];

        return offer;
    }

    private makeMediaDescription(type: string): any {
        const transport = this.endpointDescription["bundle-transport"];

        const result = {
            mid: this.nextMid.toString(),
            type: type,
            port: 9,
            protocol: 'RTP/SAVPF',
            payloads: '',
            rtp: [],
            fmtp: [],
            rtcpFb: [],
            rtcp: {
                "port": 9,
                "netType": "IN",
                "ipVer": 4,
                "address": "0.0.0.0"
            },
            ext: [],
            ssrcs: [],
            ssrcGroups: [],
            iceUfrag: transport.ice.ufrag,
            icePwd: transport.ice.pwd,
            fingerprint: {
                type: transport.dtls.type,
                hash: transport.dtls.hash
            },
            setup: transport.dtls.setup === 'actpass' ? 'active' : 'actpass',
            direction: <'sendrecv' | 'recvonly' | 'sendonly' | 'inactive' | undefined>'sendonly',
            rtcpMux: 'rtcp-mux',
            candidates: transport.ice.candidates.flatMap(element => {
                return {
                    foundation: element.foundation,
                    component: element.component,
                    transport: element.protocol,
                    priority: element.priority,
                    ip: element.ip,
                    port: element.port,
                    type: element.type,
                    raddr: element.relAddr,
                    rport: element.relPort,
                    generation: element.generation,
                    'network-id': element.network
                };
            })
        }

        this.usedMids.push(this.nextMid.toString());
        this.nextMid++;
        return result;
    }

    private addIngestMids(offer: SessionDescription) {
        const audio = this.endpointDescription.audio;
        const audioPayloadType = audio["payload-type"];

        let audioDescription = this.makeMediaDescription('audio');
        audioDescription.payloads = audioPayloadType.id.toString();
        audioDescription.rtp = [{
            payload: audioPayloadType.id,
            codec: audioPayloadType.name,
            rate: audioPayloadType.clockrate,
            encoding: audioPayloadType.channels
        }];
        audioDescription.fmtp = [{
            payload: audioPayloadType.id,
            config: audioPayloadType.parameters
                .flatMap(element => `${element.name}=${element.value}`)
                .join(';')
        }];
        audioDescription.ext = audio["rtp-hdrexts"].flatMap(element => {
            return {value: element.id, uri: element.uri}
        });
        for (let element of this.mediaStreams.audio.ssrcs) {
            audioDescription.ssrcs.push({ id:element.ssrc, attribute: 'cname', value: element.cname });
            audioDescription.ssrcs.push({ id:element.ssrc, attribute: 'label', value: element.label });
            audioDescription.ssrcs.push({ id:element.ssrc, attribute: 'mslabel', value: element.mslabel });
            audioDescription.ssrcs.push({ id:element.ssrc, attribute: 'msid', value: `${element.label} ${element.mslabel}` });
        }
        offer.media.push(audioDescription);

        const video = this.endpointDescription.video;
        let videoDescription = this.makeMediaDescription('video');
        videoDescription.payloads = video["payload-types"]
            .flatMap(element => element.id)
            .join(' ');
        videoDescription.rtp = video["payload-types"].flatMap(element => {
            return {
                payload: element.id,
                codec: element.name,
                rate: element.clockrate,
                encoding: element.channels
            }
        });
        videoDescription.ext = video["rtp-hdrexts"].flatMap(element => {
            return {value: element.id, uri: element.uri}
        });

        video["payload-types"].forEach(payloadType => {
            videoDescription.fmtp.push({
                payload: payloadType.id,
                config: payloadType.parameters
                    .flatMap(element => `${element.name}=${element.value}`)
                    .join(';')
            });
            
            payloadType["rtcp-fbs"].forEach(rtcpFb => {
                videoDescription.rtcpFb.push({
                    payload: payloadType.id,
                    type: rtcpFb.type,
                    subtype: rtcpFb.subtype
                });
            });
        });

        for (let element of this.mediaStreams.video.ssrcs) {
            videoDescription.ssrcs.push({ id:element.ssrc, attribute: 'cname', value: element.cname });
            videoDescription.ssrcs.push({ id:element.ssrc, attribute: 'label', value: element.label });
            videoDescription.ssrcs.push({ id:element.ssrc, attribute: 'mslabel', value: element.mslabel });
            videoDescription.ssrcs.push({ id:element.ssrc, attribute: 'msid', value: `${element.label} ${element.mslabel}` });
        }

        videoDescription.ssrcGroups = this.mediaStreams.video.ssrcGroups.flatMap(element => {
            return {
                semantics: element.semantics, 
                ssrcs: element.ssrcs.join(' ')
            }
        });
        offer.media.push(videoDescription);
    }

    private addSFUMids(offer: SessionDescription) {
        const video = this.endpointDescription.video;
        const videoSsrc = video.ssrcs[0];

        let videoDescription = this.makeMediaDescription('video');
        videoDescription.payloads = video["payload-types"]
            .flatMap(element => element.id)
            .join(' ');
        videoDescription.rtp = video["payload-types"].flatMap(element => {
            return {
                payload: element.id,
                codec: element.name,
                rate: element.clockrate,
                encoding: element.channels
            }
        });
        videoDescription.ext = video["rtp-hdrexts"].flatMap(element => {
            return {value: element.id, uri: element.uri}
        });
        videoDescription.ssrcs = [
            { id: videoSsrc, attribute: 'cname', value: 'feedbackvideocname' },
            { id: videoSsrc, attribute: 'label', value: 'feedbackvideolabel' },
            { id: videoSsrc, attribute: 'mslabel', value: 'feedbackvideomslabel' },
            { id: videoSsrc, attribute: 'msid', value: 'feedbackvideomslabel feedbackvideolabel' }
        ];
        offer.media.push(videoDescription);

        let dataDescription = this.makeMediaDescription('application');
        dataDescription.protocol = 'UDP/DTLS/SCTP';
        dataDescription.payloads = 'webrtc-datachannel';
        dataDescription.sctpmap = {
            sctpmapNumber: 5000,
            app: 'webrtc-datachannel',
            maxMessageSize: 262144
        };
        offer.media.push(dataDescription);
    }

    async handlePut(request: ViewerAnswerRequest): Promise<void> {
        console.log('handlePut ' + JSON.stringify(request));

        this.endpointDescription.audio.ssrcs = [];
        this.endpointDescription.video.ssrcs = [];
        this.endpointDescription.video["ssrc-groups"] = [];

        const parsedAnswer = parse(request.answer);
        const answerMediaDescription = parsedAnswer.media[0];
        let transport = this.endpointDescription["bundle-transport"];
        transport.dtls.type = answerMediaDescription.fingerprint.type;
        transport.dtls.hash = answerMediaDescription.fingerprint.hash;
        transport.dtls.setup = answerMediaDescription.setup;
        transport.ice.ufrag = answerMediaDescription.iceUfrag;
        transport.ice.pwd = answerMediaDescription.icePwd;
        transport.ice.candidates = !answerMediaDescription.candidates ? [] : answerMediaDescription.candidates.flatMap(element => {
            return {
                'generation': element.generation,
                'component': element.component,
                'protocol': element.transport,
                'port': element.port,
                'ip': element.ip,
                'relPort': element.rport,
                'relAddr': element.raddr,
                'foundation': element.foundation,
                'priority': parseInt(element.priority.toString(), 10),
                'type': element.type,
                'network': element["network-id"]
            };
        });
        this.endpointDescription["action"] = "configure";

        console.log(JSON.stringify(this.endpointDescription));

        const url = SMB_URL + this.sfuResourceId + '/' + this.viewerId;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.endpointDescription)
        });

        if (!response.ok) {
            return Promise.reject();
        }
    }

    async handlePatch(request: ViewerCandidateRequest): Promise<void> {
    }

    send(channelLabel: string, message: any) {
    }

    destroy() {
    }
}
