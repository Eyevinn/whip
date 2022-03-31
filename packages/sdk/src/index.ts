export interface WHIPClientIceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface WHIPClientOptions {
  debug?: boolean;
  iceServers?: WHIPClientIceServer[]
}

export interface WHIPClientConstructor {
  endpoint: string;
  element: HTMLVideoElement;
  opts?: WHIPClientOptions;
}

export class WHIPClient {
  private pc: RTCPeerConnection;
  private whipEndpoint: URL;
  private videoElement: HTMLVideoElement;
  private resource: string;
  private debug: boolean;

  constructor({ endpoint, element, opts }: WHIPClientConstructor) {
    let iceServers = [{ urls: "stun:stun.l.google.com:19320" }];
    if (opts && opts.iceServers) {
      iceServers = opts.iceServers;
    }
    this.pc = new RTCPeerConnection({
      iceServers: iceServers,
    });
    if (opts && opts.debug) {
      this.pc.oniceconnectionstatechange = e => console.log(this.pc.iceConnectionState);
      this.debug = true;
    }
    this.videoElement = element;
    this.whipEndpoint = new URL(endpoint);

    this.pc.onicecandidate = async (event) => {
      if (event.candidate === null) {
        const response = await fetch(this.whipEndpoint.href, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp"
          },
          body: this.pc.localDescription.sdp
        });
        if (response.ok) {
          this.resource = response.headers.get("Location");
          if (this.debug) {
            console.log("WHIP Resource: " + this.resource);
          }
          const answer = await response.text();
          this.pc.setRemoteDescription({
            type: "answer",
            sdp: answer,
          });
        } else {
          console.error("Failed to setup stream connection with endpoint");
          const message = await response.text();
          console.error(response.status + ": " + message);
        }
      }
    }
  }

  async connect(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => this.pc.addTrack(track, stream));

    this.videoElement.srcObject = stream;
    const sdpOffer = await this.pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    this.pc.setLocalDescription(sdpOffer);    
  }

  async destroy(): Promise<void> {
    // TODO: delete WHIP resource
    // curl -X DELETE this.resource
  }

  async getResourceUri() {
    if (this.resource) {
      return this.resource;
    }
    const p: Promise<void> = new Promise((resolve, reject) => {
      let t = setInterval(() => {
        if (this.resource) {
          clearInterval(t);
          resolve();
        }
      }, 1000);
    })
    await p;
    return this.resource;
  }
}