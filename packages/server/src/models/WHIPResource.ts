import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from "uuid";
import { Broadcaster } from "../broadcaster";

const ICE_TRICKLE_TIMEOUT = process.env.ICE_TRICKLE_TIMEOUT ? parseInt(process.env.ICE_TRICKLE_TIMEOUT) : 4000;

export const IANA_PREFIX = "urn:ietf:params:whip:";

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
  private iceServers: WHIPResourceICEServer[];
  private iceCount: number;

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[]) {
    this.sdpOffer = sdpOffer;
    this.iceServers = iceServers || [];
    this.pc = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
      iceServers: this.iceServers,
    });

    this.resourceId = uuidv4();
    this.pc.oniceconnectionstatechange = e => this.log(`iceconnection=${this.pc.iceConnectionState}`);
    this.pc.onicegatheringstatechange = e => this.log(`icegathering=${e.target.iceGatheringState}`);
    this.pc.onicecandidateerror = e => this.log(`icecandidate=${e.url} returned an error with code ${e.errorCode}: ${e.errorText}`);
    this.pc.onconnectionstatechange = async (e) => await this.handleConnectionStateChange();
    this.iceCount = 0;
  }

  protected log(...args: any[]) {
    console.log(`[${this.resourceId}]:`, ...args);
  }

  protected onIceConnectionStateChange(e) {
    this.log(`${this.pc.iceConnectionState}`);
  }

  async beforeAnswer() {}

  async sdpAnswer() {
    this.log("Received offer from sender");
    await this.pc.setRemoteDescription({
      type: "offer",
      sdp: this.sdpOffer,
    });
    this.remoteSdp = this.sdpOffer;
    await this.beforeAnswer();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitUntilIceGatheringStateComplete();
    this.localSdp = this.pc.localDescription.sdp;

    this.log("Returning answer back to sender");
    return this.localSdp;
  }

  async onconnect(state) {

  }

  async ondisconnect(state) {

  }

  assignBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  getIceServers(): WHIPResourceICEServer[] {
    return this.iceServers;
  }

  getProtocolExtensions(): string[] {
    return [];
  }

  private async handleConnectionStateChange() {
    this.log(`peerconnection=${this.pc.connectionState}`);
    switch(this.pc.connectionState) {
      case "connected":
        await this.onconnect(this.pc.connectionState);
        break;
      case "disconnected":
      case "closed":
      case "failed":
        await this.ondisconnect(this.pc.connectionState);
        break;
    }
  }

  private async waitUntilIceGatheringStateComplete() {
    if (this.pc.iceGatheringState === "complete") {
      return;
    }

    const p: Promise<void> = new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pc.removeEventListener("icecandidate", onIceCandidate);
        if (this.iceCount > 0) {
          this.log(`ICE gathering timed out but we have ${this.iceCount} so send what we have.`);
          resolve();
        } else {
          reject(new Error("Timed out waiting for host candidates"));
        }
      }, ICE_TRICKLE_TIMEOUT);
      const onIceCandidate = ({ candidate }) => {
        if (!candidate) {
          clearTimeout(t);
          this.pc.removeEventListener("icecandidate", onIceCandidate);
          this.log(`ICE candidates gathered`);
          resolve();
        } else {
          this.log(`Got candidate=${candidate.candidate}`);
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

  destroy() {
    this.log("Destroy requested and closing peer");
    this.pc.close();
  }
}
