export interface WHIPClientOptions {
  debug?: boolean;
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
    this.pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
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
        this.resource = response.headers.get("Location");
        if (this.debug) {
          console.log("WHIP Resource: " + this.resource);
        }
        const answer = await response.text();
        this.pc.setRemoteDescription({
          type: "answer",
          sdp: answer,
        });
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
    
    this.pc.ontrack = event => {
      const el = this.videoElement;
      el.srcObject = event.streams[0];
      el.autoplay = true;
      el.controls = true;
    }
  }

  async destroy(): Promise<void> {
    // TODO: delete WHIP resource
    // curl -X DELETE this.resource
  }
}