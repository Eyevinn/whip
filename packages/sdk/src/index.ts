import { parseWHIPIceLinkHeader } from "./util";
import { EventEmitter } from "events";
import { WHIPProtocol } from "./WHIPProtocol";
import { SessionDescription, MediaAttributes, parse, write, MediaDescription } from 'sdp-transform'

export interface WHIPClientIceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface WHIPClientOptions {
  debug?: boolean;
  iceServers?: WHIPClientIceServer[];
  iceGatheringTimeout?: number;
  authkey?: string;
}

export interface WHIPClientConstructor {
  endpoint: string;
  opts?: WHIPClientOptions;
  whipProtocol: WHIPProtocol;
  peerConnectionFactory: (configuration: RTCConfiguration) => RTCPeerConnection;
}

interface IceCredentials {
  ufrag: string;
  pwd: string
}

export class WHIPClient extends EventEmitter {
  private whipEndpoint: URL;
  private opts: WHIPClientOptions;

  private peer: RTCPeerConnection;
  private resource: string;
  private extensions: string[];
  private resourceResolve: (resource: string) => void;
  private iceCredentials: IceCredentials | undefined = undefined;
  private mediaMids: Array<string> = [];
  private whipProtocol: WHIPProtocol;
  private peerConnectionFactory: (configuration: RTCConfiguration) => RTCPeerConnection;

  constructor({ endpoint, opts, whipProtocol, peerConnectionFactory }: WHIPClientConstructor) {
    super();
    this.whipEndpoint = new URL(endpoint);
    this.opts = opts;
    this.whipProtocol = whipProtocol;
    this.peerConnectionFactory = peerConnectionFactory;
    this.initPeer();
  }

  private initPeer() {
    this.peer = this.peerConnectionFactory({
      iceServers: this.opts.iceServers || [
        {
          urls: ["stun:stun.l.google.com:19302"],
        },
      ],
    });

    this.peer.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange.bind(this));
    this.peer.addEventListener('icecandidateerror', this.onIceCandidateError.bind(this));
    this.peer.addEventListener('connectionstatechange', this.onConnectionStateChange.bind(this));
    this.peer.addEventListener('icecandidate', this.onIceCandidate.bind(this));
  }

  private log(...args: any[]) {
    if (this.opts.debug) {
      console.log("WHIPClient", ...args);
    }
  }

  private error(...args: any[]) {
    console.error("WHIPClient", ...args);
  }

  private makeSDPTransformCandidate(candidate: RTCIceCandidate): any {
    return {
      foundation: candidate.foundation,
      component: candidate.component === 'rtp' ? 0 : 1,
      transport: candidate.protocol.toString(),
      priority: candidate.priority,
      ip: candidate.address,
      port: candidate.port,
      type: candidate.type.toString(),
      raddr: candidate?.relatedAddress,
      rport: candidate?.relatedPort,
      tcptype: candidate?.tcpType?.toString()
    };
  }

  private makeTrickleIceSdpFragment(candidate: RTCIceCandidate): string | undefined {
    if (!this.iceCredentials || this.mediaMids.length === 0) {
      this.error("Missing local SDP meta data, cannot send trickle ICE candidate");
      return undefined;
    }

    let trickleIceSDP: SessionDescription = {
      media: [],
      iceUfrag: this.iceCredentials.ufrag,
      icePwd: this.iceCredentials.pwd
    };

    // Create the SDP fragment as defined in https://www.rfc-editor.org/rfc/rfc8840.html
    for (let mediaMid of this.mediaMids) {
      const media = {
        type: 'audio',
        port: 9,
        protocol: 'RTP/AVP',
        payloads: '0',
        rtp: [],
        fmtp: [],
        mid: mediaMid,
        candidates: [
          this.makeSDPTransformCandidate(candidate)
        ]
      };
      trickleIceSDP.media.push(media);
    }

    const trickleIceSDPString = write(trickleIceSDP);

    // sdp-transform appends standard SDP fields that are not used in WHIP trickle ICE SDP fragments, remove them from the result.
    return trickleIceSDPString.replace('v=0\r\ns= \r\n', '');
  }

  async onIceCandidate(event: Event) {
    if (event.type !== 'icecandidate') {
      return;
    }
    const candidateEvent = <RTCPeerConnectionIceEvent>(event);
    const candidate: RTCIceCandidate | null = candidateEvent.candidate;
    if (!candidate) {
      return;
    }

    const trickleIceSDP = this.makeTrickleIceSdpFragment(candidate);
    const url = await this.getResourceUrl();
    this.whipProtocol.updateIce(url, trickleIceSDP)
  }

  async onConnectionStateChange(event: Event) {
    this.log("PeerConnectionState", this.peer.connectionState);

    switch (this.peer.connectionState) {
      case "disconnected":
        await this.destroy();
        break;
    }
  }

  onIceConnectionStateChange(e) {
    this.log("IceConnectionState", this.peer.iceConnectionState);
  }

  onIceCandidateError(e) {
    this.log("IceCandidateError", e);
  }

  private async startSdpExchange(): Promise<void> {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
    // 
    // Client peer creates an offer
    const sdpOffer = await this.peer.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });

    const parsedOffer: SessionDescription | undefined = sdpOffer.sdp && parse(sdpOffer.sdp);
    if (!parsedOffer) {
      return Promise.reject();
    }

    if (parsedOffer.iceUfrag && parsedOffer.icePwd) {
      this.iceCredentials = {
        pwd: parsedOffer.icePwd,
        ufrag: parsedOffer.iceUfrag
      };

    } else if (parsedOffer.media.length !== 0 &&
      parsedOffer.media[0].iceUfrag &&
      parsedOffer.media[0].icePwd) {
      this.iceCredentials = {
        pwd: parsedOffer.media[0].icePwd,
        ufrag: parsedOffer.media[0].iceUfrag
      };
    }

    for (let media of parsedOffer.media) {
      if (media.mid) {
        this.mediaMids.push(media.mid);
      }
    }

    const response = await this.whipProtocol.sendOffer(
      this.whipEndpoint.toString(),
      this.opts.authkey,
      sdpOffer.sdp);

    await this.peer.setLocalDescription(sdpOffer);

    if (response.ok) {
      this.resource = response.headers.get("Location");
      this.log("WHIP Resource", this.resource);

      this.extensions = response.headers.get("Link").split(",").map(v => v.trimStart());
      this.log("WHIP Resource Extensions", this.extensions);

      if (this.resourceResolve) {
        this.resourceResolve(this.resource);
        this.resourceResolve = null;
      }

      const answer = await response.text();
      await this.peer.setRemoteDescription({
        type: "answer",
        sdp: answer,
      });
    } else {
      this.error("IceCandidate", "Failed to setup stream connection with endpoint", response.status, await response.text());
    }
  }

  private async doFetchICEFromEndpoint(): Promise<WHIPClientIceServer[]> {
    let iceServers: WHIPClientIceServer[] = [];
    const response = await this.whipProtocol.getConfiguration(
      this.whipEndpoint.toString(),
      this.opts.authkey);

    if (response.ok) {
      response.headers.forEach((v, k) => {
        if (k == "link") {
          const ice = parseWHIPIceLinkHeader(v);
          if (ice) {
            iceServers.push(ice);
          }
        }
      });
    }
    return iceServers;
  }

  async setIceServersFromEndpoint(): Promise<void> {
    if (this.opts.authkey) {
      this.log("Fetching ICE config from endpoint");
      const iceServers: WHIPClientIceServer[] = await this.doFetchICEFromEndpoint();
      this.peer.setConfiguration({ iceServers: iceServers });
    } else {
      this.error("No authkey is provided so cannot fetch ICE config from endpoint.");
    }
  }

  setupBackChannel() {
    const channel = this.peer.createDataChannel("backchannel");
    channel.onmessage = (ev) => {
      this.emit("message", ev.data);
    };
  }

  async ingest(mediaStream: MediaStream): Promise<void> {
    if (!this.peer) {
      this.initPeer();
    }
    mediaStream
      .getTracks()
      .forEach((track) => this.peer.addTrack(track, mediaStream));

    await this.startSdpExchange();
  }

  async destroy(): Promise<void> {
    const resourceUrl = await this.getResourceUrl();
    await this.whipProtocol.delete(resourceUrl).catch((e) => this.error("destroy()", e));

    const senders = this.peer.getSenders();
    if (senders) {
      senders.forEach(sender => {
        sender.track.stop();
      });
    }

    this.peer.close();
    this.resource = null;
    this.peer = null;
  }

  getResourceUrl(): Promise<string> {
    if (this.resource) {
      return Promise.resolve(this.resource);
    }
    return new Promise((resolve) => {
      // resolved in onIceCandidate
      this.resourceResolve = resolve;
    });
  }

  async getResourceExtensions(): Promise<string[]> {
    await this.getResourceUrl();
    return this.extensions;
  }
}
