import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from 'uuid';

// Abstract base class

// WebRTC signalling workflow
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity

export class WHIPResource {
  protected sdpOffer: string;
  protected pc: RTCPeerConnection;
  private resourceId: string;

  constructor(sdpOffer: string) {
    this.sdpOffer = sdpOffer;
    this.pc = new RTCPeerConnection({
      sdpSemantics: "unified-plan"
    });
    this.resourceId = uuidv4();
    this.pc.oniceconnectionstatechange = e => console.log(`[${this.resourceId}]: ${this.pc.iceConnectionState}`);
  }

  async beforeAnswer() {

  }

  async sdpAnswer() {
    await this.pc.setRemoteDescription({
      type: "offer",
      sdp: this.sdpOffer
    });
    await this.beforeAnswer();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitUntilIceGatheringStateComplete();
    return answer.sdp;
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
}