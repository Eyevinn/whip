export interface WHIPClientOptions {
  debug?: boolean;
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
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    this.peer.oniceconnectionstatechange =
      this.onIceConnectionStateChange.bind(this);
    this.peer.onicecandidate = this.onIceCandidate.bind(this);
  }

  private log(...args: any[]) {
    if (this.opts.debug) {
      console.log("WHIPClient", ...args);
    }
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
        },
        body: this.peer.localDescription.sdp,
      });

      this.resource = response.headers.get("Location");
      if (this.resourceResolve) {
        this.resourceResolve(this.resource);
        this.resourceResolve = null;
      }

      const answer = await response.text();
      this.peer.setRemoteDescription({
        type: "answer",
        sdp: answer,
      });
    }
  }

  async ingest(mediaStream: MediaStream): Promise<void> {
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
    await fetch(resourceUrl, { method: "DELETE" });
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
