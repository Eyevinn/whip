import { WhipResource, WhipResourceIceServer, IANA_PREFIX } from "../whipResource";
import { MediaStreamsInfo, MediaStreamsInfoSsrc } from '../../mediaStreamsInfo'
import { parse, SessionDescription, write } from 'sdp-transform'
import { v4 as uuidv4 } from "uuid";
import { SmbEndpointDescription, SmbProtocol } from "../../smb/smbProtocol";
import { clearTimeout } from "timers";
import { BroadcasterClientSfuPair } from '../../broadcasterClient';

interface EgressResource {
  broadcasterClientSfuPair: BroadcasterClientSfuPair;
  sfuResourceId?: string;
}

export class SfuWhipResource implements WhipResource {
  private resourceId: string;
  private egressResources: EgressResource[] = [];
  private sfuOriginResourceId?: string = undefined;
  private offer: string;
  private answer?: string = undefined;
  private smbOriginUrl?: string = undefined;
  private channelId?: string = undefined;
  private eTag: string;
  private mediaStreams: MediaStreamsInfo;
  private smbProtocol: SmbProtocol;
  private channelHealthTimeout?: NodeJS.Timeout;

  constructor(smbProtocolFactory: () => SmbProtocol, sdpOffer: string, channelId?: string) {
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

    this.smbProtocol = smbProtocolFactory();
  }

  async connect() {
    if (!this.smbOriginUrl) {
      const error = 'No origin SFU configured';
      console.error(error);
      throw error;
    }

    await this.setupSfu();

    this.egressResources.forEach(async (element) => {
      console.log(`connect element ${JSON.stringify(element)}`);
      try {
        await element.broadcasterClientSfuPair.client.createChannel(this.channelId, element.sfuResourceId, this.mediaStreams);
      } catch (e) {
        console.log(`Delete and retry creating channel ${this.channelId} on egress`);
        await element.broadcasterClientSfuPair.client.removeChannel(this.channelId);
        await element.broadcasterClientSfuPair.client.createChannel(this.channelId, element.sfuResourceId, this.mediaStreams);
      }
    });
      
    this.checkChannelHealth();
  }

  private async checkChannelHealth() {
    try {
      const result = await this.smbProtocol.getConferences(this.smbOriginUrl);
      if (result.find(element => element === this.sfuOriginResourceId) === undefined) {
        console.log(`SFU resource does not exist, deleting channel ${this.channelId}`);
        this.egressResources.forEach(async (element) => {
          await element.broadcasterClientSfuPair.client.removeChannel(this.channelId);
        });

        return;
      }
    } catch (error) {
      console.log(`SFU not responding, deleting channel ${this.channelId}`);
      this.egressResources.forEach(async (element) => {
        await element.broadcasterClientSfuPair.client.removeChannel(this.channelId);
      });
      return;
    }

    this.channelHealthTimeout = setTimeout(() => {
      this.checkChannelHealth();
    }, 10000);
  }

  private createAnswer(endpointDescription: SmbEndpointDescription) {
    const parsedSDP = parse(this.offer);

    parsedSDP.origin.sessionVersion++;
    parsedSDP['extmapAllowMixed'] = undefined;

    if (!parsedSDP.msidSemantic) {
      parsedSDP.msidSemantic = {
        semantic: 'WMS',
        token: ''
      };
    }

    let bundleGroupMids = '';
    const transport = endpointDescription['bundle-transport'];
    let candidatesAdded = false;

    for (let media of parsedSDP.media) {
      bundleGroupMids = bundleGroupMids === '' ? `${media.mid}` : `${bundleGroupMids} ${media.mid}`

      media['iceOptions'] = undefined;
      media.iceUfrag = transport.ice.ufrag;
      media.icePwd = transport.ice.pwd;
      media.fingerprint.type = transport.dtls.type;
      media.fingerprint.hash = transport.dtls.hash;
      media.setup = media.setup === 'actpass' ? 'active' : 'actpass';
      media.ssrcGroups = undefined;
      media.ssrcs = undefined;
      media.msid = undefined;
      media.candidates = undefined;
      media.port = 9;
      media.rtcp = {
        port: 9,
        netType: 'IN',
        ipVer: 4,
        address: '0.0.0.0'
      }

      if (!candidatesAdded) {
        media.candidates = transport.ice.candidates.map(candidate => {
          return {
            foundation: candidate.foundation,
            component: candidate.component,
            transport: candidate.protocol,
            priority: candidate.priority,
            ip: candidate.ip,
            port: candidate.port,
            type: candidate.type,
            raddr: candidate['rel-addr'],
            rport: candidate['rel-port'],
            generation: candidate.generation,
            'network-id': candidate.network
          };
        });

        candidatesAdded = true;
      }

      if (media.type === 'audio') {
        media.rtp = media.rtp.filter(rtp => rtp.codec.toLowerCase() === 'opus');
        let opusPayloadType = media.rtp.at(0).payload;

        media.fmtp = media.fmtp.filter(fmtp => fmtp.payload === opusPayloadType);
        media.payloads = `${opusPayloadType}`;

        media.ext = media.ext && media.ext.filter(ext => ext.uri === 'urn:ietf:params:rtp-hdrext:ssrc-audio-level' ||
          ext.uri === 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time');

        media.direction = 'recvonly';
        media.rtcpFb = undefined;

      } else if (media.type === 'video') {
        const vp8Codec = media.rtp.find(rtp => rtp.codec === 'VP8');
        const vp8PayloadType = vp8Codec.payload;

        const rtxFmtp = media.fmtp.find(fmtp => fmtp.config === `apt=${vp8PayloadType}`);
        const vp8RtxPayloadType = rtxFmtp.payload;

        media.rtp = media.rtp.filter(rtp => rtp.payload === vp8PayloadType || rtp.payload === vp8RtxPayloadType);

        media.fmtp = media.fmtp.filter(fmtp => fmtp.payload === vp8PayloadType || fmtp.payload === vp8RtxPayloadType);
        media.payloads = `${vp8PayloadType} ${vp8RtxPayloadType}`;
        media.setup = 'active';

        media.ext = media.ext && media.ext.filter(ext => ext.uri === 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time' ||
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

  private async setupEdgeSfu(smbEdgeUrl: string, ingestorOffer: SessionDescription): Promise<string> {
    let sfuEdgeResourceId = await this.smbProtocol.allocateConference(smbEdgeUrl);

    let audioSsrc: string | undefined = undefined;
    let videoMainSsrc: string | undefined = undefined;
    let videoRtxSsrc: string | undefined = undefined;

    let offerAudio = ingestorOffer.media.find(element => element.type === 'audio');
    if (offerAudio && offerAudio.ssrcs) {
      audioSsrc = offerAudio.ssrcs.at(0).id.toString();
    }

    let offerVideo = ingestorOffer.media.find(element => element.type === 'video');
    if (offerVideo && offerVideo.ssrcs) {
      videoMainSsrc = offerVideo.ssrcs.at(0).id.toString();
      videoRtxSsrc = offerVideo.ssrcs.at(1).id.toString();
    }

    console.log(`Edge forward audio ${audioSsrc}, video ${videoMainSsrc} ${videoRtxSsrc}`);

    const edgeEndpointDesc = await this.smbProtocol.allocateEndpoint(
      smbEdgeUrl,
      sfuEdgeResourceId,
      'forward_edge_in',
      offerAudio !== undefined,
      offerVideo !== undefined,
      false);

    const originOutEndpointId = uuidv4();

    const originEndpointDesc = await this.smbProtocol.allocateEndpoint(
      this.smbOriginUrl,
      this.sfuOriginResourceId,
      originOutEndpointId,
      ingestorOffer.media.find(element => element.type === 'audio') !== undefined,
      ingestorOffer.media.find(element => element.type === 'video') !== undefined,
      ingestorOffer.media.find(element => element.type === 'application') !== undefined);

    originEndpointDesc.audio.ssrcs = [audioSsrc];
    originEndpointDesc.video.ssrcs = [videoMainSsrc, videoRtxSsrc];
    originEndpointDesc.video['ssrc-groups'] = [{
      semantics: 'FID',
      ssrcs: [videoMainSsrc, videoRtxSsrc]
    }];

    edgeEndpointDesc.audio.ssrcs = [];
    edgeEndpointDesc.video.ssrcs = [];
    edgeEndpointDesc['bundle-transport'].dtls.setup = 'active';

    console.log(`Configuring edge with\n${JSON.stringify(originEndpointDesc)}`);
    console.log(`Configuring origin with\n${JSON.stringify(edgeEndpointDesc)}`);

    this.smbProtocol.configureEndpoint(smbEdgeUrl, sfuEdgeResourceId, 'forward_edge_in', originEndpointDesc);
    this.smbProtocol.configureEndpoint(this.smbOriginUrl, this.sfuOriginResourceId, originOutEndpointId, edgeEndpointDesc);

    return sfuEdgeResourceId;
  }

  private async setupSfu() {
    this.sfuOriginResourceId = await this.smbProtocol.allocateConference(this.smbOriginUrl);

    const parsedOffer = parse(this.offer);

    const endpointDescription = await this.smbProtocol.allocateEndpoint(
      this.smbOriginUrl,
      this.sfuOriginResourceId,
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

        endpointDescription.video["ssrc-groups"] = media.ssrcGroups.map(mediaSsrcGroup => {
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
        media.ext && media.ext.forEach(ext => endpointDescription.audio["rtp-hdrexts"].push({ id: ext.value, uri: ext.uri }));

      } else if (media.type === 'video') {
        endpointDescription.video["payload-types"][0].id = media.rtp[0].payload;
        endpointDescription.video["payload-types"][1].id = media.rtp[1].payload;
        endpointDescription.video["payload-types"][1].parameters = { 'apt': media.rtp[0].payload.toString() };

        endpointDescription.video["rtp-hdrexts"] = [];
        media.ext && media.ext.forEach(ext => endpointDescription.video["rtp-hdrexts"].push({ id: ext.value, uri: ext.uri }));

        endpointDescription.video["payload-types"].forEach(payloadType => {
          const rtcpFbs = media.rtcpFb.filter(element => element.payload === payloadType.id);
          payloadType["rtcp-fbs"] = rtcpFbs.map(rtcpFb => {
            return {
              type: rtcpFb.type,
              subtype: rtcpFb.subtype
            };
          });
        });
      }
    }

    this.extractMediaStreams(parsedOffer);
    await this.smbProtocol.configureEndpoint(this.smbOriginUrl, this.sfuOriginResourceId, 'ingest', endpointDescription);

    for (let egressResource of this.egressResources) {
      egressResource.sfuResourceId = await this.setupEdgeSfu(egressResource.broadcasterClientSfuPair.sfuUrl, parsedOffer);
    }
    console.log(`egressResources ${JSON.stringify(this.egressResources)}`);
  }

  // Extract media stream information from the WHIP client offer
  private extractMediaStreams(parsedOffer: SessionDescription) {
    let audioMediaStreams = new Map<string, MediaStreamsInfoSsrc>();
    let videoMediaStreams = new Map<string, MediaStreamsInfoSsrc>();

    for (let media of parsedOffer.media) {
      if (media.type !== 'audio' && media.type !== 'video') {
        continue;
      }

      let mediaStreams = media.type === 'audio' ? audioMediaStreams : videoMediaStreams;
      media.ssrcs.forEach(ssrc => {
        const ssrcString = ssrc.id.toString();

        let resourceSsrc = mediaStreams.has(ssrcString) ?
          mediaStreams.get(ssrcString) : <MediaStreamsInfoSsrc>{ ssrc: ssrcString };

        switch (ssrc.attribute) {
          case 'cname':
            resourceSsrc.cname = ssrc.value;
            break;
          case 'msid':
            [resourceSsrc.mslabel, resourceSsrc.label] = ssrc.value.split(' ');
            break;
        }

        mediaStreams.set(ssrcString, resourceSsrc);
      });

      this.mediaStreams.video.ssrcGroups = media.ssrcGroups && media.ssrcGroups.map(ssrcGroup => {
        return {
          semantics: ssrcGroup.semantics,
          ssrcs: ssrcGroup.ssrcs.split(' ')
        };
      });
    }

    audioMediaStreams.forEach(value => this.mediaStreams.audio.ssrcs.push(value));
    videoMediaStreams.forEach(value => this.mediaStreams.video.ssrcs.push(value));
  }

  sdpAnswer(): Promise<string> {
    if (!this.answer) {
      return Promise.reject();
    }

    return Promise.resolve(this.answer);
  }

  assignBroadcasterClients(broadcasterClientSfuPairs: BroadcasterClientSfuPair[]) {
    console.log(`assignBroadcasterClients ${JSON.stringify(broadcasterClientSfuPairs)}`);
    this.egressResources = broadcasterClientSfuPairs.map((element) => {
      return {
        broadcasterClientSfuPair: element, 
        sfuResourceId: undefined
      }
    });

    console.log(JSON.stringify(broadcasterClientSfuPairs));
  }

  setOriginSfuUrl(url: string) {
    this.smbOriginUrl = url;
  }

  getIceServers(): WhipResourceIceServer[] {
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

  getMediaStreams(): MediaStreamsInfo {
    return this.mediaStreams;
  }

  destroy() {
    this.egressResources.forEach(async (element) => {
      await element.broadcasterClientSfuPair.client.removeChannel(this.channelId);
    });
    if (this.channelHealthTimeout) {
      clearTimeout(this.channelHealthTimeout);
      this.channelHealthTimeout = undefined;
    }
  }
}
