import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from 'uuid';
import { Broadcaster } from "../broadcaster";

const ICE_TRICKLE_TIMEOUT = process.env.ICE_TRICKLE_TIMEOUT ? parseInt(process.env.ICE_TRICKLE_TIMEOUT) : 4000;

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
  private iceCount: number;

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[]) {
    this.sdpOffer = sdpOffer;
    this.pc = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
      iceServers: iceServers,
    });

    this.resourceId = uuidv4();
    this.pc.oniceconnectionstatechange = e => console.log(`[${this.resourceId}]: connection=${this.pc.iceConnectionState}`);
    this.pc.onicegatheringstatechange = e => console.log(`[${this.resourceId}]: icegathering=${e.target.iceGatheringState}`);
    this.pc.onicecandidateerror = e => console.error(`[${this.resourceId}]: icecanddiate=${e.url} returned an error with code ${e.errorCode}: ${e.errorText}`);
    this.iceCount = 0;
  }

  async beforeAnswer() {

  }

  async sdpAnswer() {
    await this.pc.setRemoteDescription({
      type: "offer",
      sdp: this.sdpOffer
    });
    this.remoteSdp = this.sdpOffer;
    await this.beforeAnswer();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitUntilIceGatheringStateComplete();
    this.localSdp = this.pc.localDescription.sdp;
    return this.localSdp;
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
        if (this.iceCount > 0) {
          console.log(`ICE gathering timed out but we have ${this.iceCount} so send what we have.`);
          resolve();
        } else {
          reject(new Error("Timed out waiting for host candidates"));
        }
      }, ICE_TRICKLE_TIMEOUT);
      const onIceCandidate = ({ candidate }) => {
        if (!candidate) {
          clearTimeout(t);
          this.pc.removeEventListener("icecandidate", onIceCandidate);
          console.log(`[${this.resourceId}]: ICE candidates gathered`);
          resolve();
        } else {
          console.log(`[${this.resourceId}]: ${candidate.candidate}`);
          this.iceCount++;
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
}
