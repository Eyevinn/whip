import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from "uuid";
import { Broadcaster } from "../broadcaster";

// Abstract base class

export interface WHIPResourceICEServer {
  urls: string;
  username?: string;
  credential?: string;
}

// WebRTC signalling workflow
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity

export class WHIPResource {
  protected sdpOffer: string;
  protected pc: RTCPeerConnection;
  protected broadcaster: Broadcaster;

  private resourceId: string;
  private localSdp: string;
  private remoteSdp: string;

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[]) {
    this.sdpOffer = sdpOffer;
    this.pc = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
      iceServers: iceServers,
    });

    this.resourceId = uuidv4();
    this.pc.oniceconnectionstatechange =
      this.onIceConnectionStateChange.bind(this);
  }

  protected onIceConnectionStateChange(e) {
    console.log(`[${this.resourceId}]: ${this.pc.iceConnectionState}`);
  }

  async beforeAnswer() {}

  async sdpAnswer() {
    await this.pc.setRemoteDescription({
      type: "offer",
      sdp: this.sdpOffer,
    });
    this.remoteSdp = this.sdpOffer;
    await this.beforeAnswer();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitUntilIceGatheringStateComplete();
    this.localSdp = answer.sdp;
    return answer.sdp;
  }

  assignBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  private async waitUntilIceGatheringStateComplete() {
    if (this.pc.iceGatheringState === "complete") {
      return;
    }

    const p: Promise<void> = new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pc.removeEventListener("icecandidate", onIceCandidate);
        reject(new Error("Timed out waiting for host candidates"));
      }, 2000);
      const onIceCandidate = ({ candidate }) => {
        if (!candidate) {
          clearTimeout(t);
          this.pc.removeEventListener("icecandidate", onIceCandidate);
          console.log(`[${this.resourceId}]: ICE candidates gathered`);
          resolve();
        }
      };
      this.pc.addEventListener("icecandidate", onIceCandidate);
    });
    await p;
  }

  getId() {
    return this.resourceId;
  }

  getType() {
    return "base";
  }

  asObject(): any {
    return {
      id: this.resourceId,
      localSdp: this.localSdp,
      remoteSdp: this.remoteSdp,
    };
  }

  destroy() {
    this.pc.close();
  }
}
