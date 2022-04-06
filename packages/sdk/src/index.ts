import { parseWHIPIceLinkHeader } from "./util";

export interface WHIPClientIceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface WHIPClientOptions {
  debug?: boolean;
  iceServers?: WHIPClientIceServer[],
  authkey?: string;
  iceConfigFromEndpoint?: boolean,
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
    this.peer.onicecandidate = this.onIceCandidate.bind(this);
    this.peer.onicecandidateerror = this.onIceCandidateError.bind(this);
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
    } else {
      this.log("IceCandidate", candidate.candidate);
    }
  }

  private onIceCandidateError(e) {
    this.log("IceCandidateError", e);
  }

  async ingest(mediaStream: MediaStream): Promise<void> {
    if (this.opts.iceConfigFromEndpoint) {
      const iceServers: WHIPClientIceServer[] = await this.doFetchICEFromEndpoint();
      this.peer.setConfiguration({ iceServers: iceServers });
    }

    mediaStream
      .getTracks()
      .forEach((track) => this.peer.addTrack(track, mediaStream));

    const sdpOffer = await this.peer.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    this.peer.setLocalDescription(sdpOffer);
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

  private async doFetchICEFromEndpoint(): Promise<WHIPClientIceServer[]> {
    let iceServers: WHIPClientIceServer[] = [];
    const response = await fetch(this.whipEndpoint.href, {
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
}
