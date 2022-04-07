import { parseWHIPIceLinkHeader } from "./util";

const DEFAULT_ICE_GATHERING_TIMEOUT = 2000;

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
}

export class WHIPClient {
  private whipEndpoint: URL;
  private opts: WHIPClientOptions;

  private peer: RTCPeerConnection;
  private resource: string;
  private resourceResolve: (resource: string) => void;
  private iceGatheringTimeout;
  private iceGatheringComplete: boolean;
  private onIceCandidateFn: ({ candidate: RTCIceCandidate }) => void;

  constructor({ endpoint, opts }: WHIPClientConstructor) {
    this.whipEndpoint = new URL(endpoint);
    this.opts = opts;

    this.peer = new RTCPeerConnection({
      iceServers: opts.iceServers || [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    this.peer.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this);
    this.peer.oniceconnectionstatechange =
      this.onIceConnectionStateChange.bind(this);
    this.peer.onicecandidateerror = this.onIceCandidateError.bind(this);
    this.onIceCandidateFn = this.onIceCandidate.bind(this);
  }

  private log(...args: any[]) {
    if (this.opts.debug) {
      console.log("WHIPClient", ...args);
    }
  }

  private error(...args: any[]) {
    console.error("WHIPClient", ...args); 
  }

  private onIceGatheringStateChange(e) {
    this.log("IceGatheringState", this.peer.iceGatheringState);
  }

  private onIceConnectionStateChange(e) {
    this.log("IceConnectionState", this.peer.iceConnectionState);
  }

  private async onIceCandidate({ candidate }) {
    if (candidate === null) {
      // ICE gathering is complete
      clearTimeout(this.iceGatheringTimeout);

      this.peer.removeEventListener("icecandidate", this.onIceCandidateFn);
      this.onIceGatheringComplete();
    } else {
      this.log("IceCandidate", candidate.candidate);
    }
  }

  private onIceCandidateError(e) {
    this.log("IceCandidateError", e);
  }

  private onIceGatheringTimeout() {
    this.log("IceGatheringTimeout");
    clearTimeout(this.iceGatheringTimeout);

    this.peer.removeEventListener("icecandidate", this.onIceCandidateFn);
    this.onIceGatheringComplete();
  }

  private async onIceGatheringComplete() {
    if (this.iceGatheringComplete) {
      return;
    }
    this.log("IceGatheringComplete");

    this.iceGatheringComplete = true;

    const response = await fetch(this.whipEndpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        "Authorization": this.opts.authkey
      },
      body: this.peer.localDescription.sdp,
    });

    if (response.ok) {
      this.resource = response.headers.get("Location");
      this.log("WHIP Resource", this.resource);
      if (this.resourceResolve) {
        this.resourceResolve(this.resource);
        this.resourceResolve = null;
      }

      const answer = await response.text();
      this.peer.setRemoteDescription({
        type: "answer",
        sdp: answer,
      });
    } else {
      this.error("IceCandidate", "Failed to setup stream connection with endpoint", response.status, await response.text());
    }
  }

  private async startSdpExchange(): Promise<void> {
    const sdpOffer = await this.peer.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    this.peer.setLocalDescription(sdpOffer);

    this.peer.addEventListener("icecandidate", this.onIceCandidateFn);
    this.iceGatheringComplete = false;
    this.iceGatheringTimeout = setTimeout(this.onIceGatheringTimeout.bind(this), this.opts.iceGatheringTimeout || DEFAULT_ICE_GATHERING_TIMEOUT);
  }

  private async doFetchICEFromEndpoint(): Promise<WHIPClientIceServer[]> {
    let iceServers: WHIPClientIceServer[] = [];
    const response = await fetch(this.whipEndpoint.toString(), {
      method: "OPTIONS",
      headers: {
        "Authorization": this.opts.authkey,
      }
    });
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

  async ingest(mediaStream: MediaStream): Promise<void> {
    mediaStream
      .getTracks()
      .forEach((track) => this.peer.addTrack(track, mediaStream));
      
    await this.startSdpExchange();
  }

  async destroy(): Promise<void> {
    const resourceUrl = await this.getResourceUrl();
    await fetch(resourceUrl, { method: "DELETE" }).catch((e) => this.error("destroy()", e));
  }

  getResourceUrl(): Promise<string> {
    if (this.resource) {
      return Promise.resolve(this.resource);
    }
    return new Promise((resolve) => {
      // resolved in onIceCandidate`
      this.resourceResolve = resolve;
    });
  }
}
