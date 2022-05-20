import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from "uuid";
import { Broadcaster } from "../broadcaster";
import { SessionDescription, parse, write } from 'sdp-transform'
import { WHIPResource, WHIPResourceICEServer } from "../models/WHIPResource";

const ICE_TRICKLE_TIMEOUT = process.env.ICE_TRICKLE_TIMEOUT ? parseInt(process.env.ICE_TRICKLE_TIMEOUT) : 2000;

interface IceCredentials {
  ufrag: string;
  pwd: string
}

export class WRTCWHIPResource implements WHIPResource {
  protected sdpOffer: string;
  protected pc: RTCPeerConnection;
  protected broadcaster: Broadcaster;

  private resourceId: string;
  private localSdp: string;
  private remoteSdp: string;
  private iceServers: WHIPResourceICEServer[];
  private iceCount: number;
  private dataChannels: RTCDataChannel[];
  private iceCredentials: IceCredentials | undefined = undefined;

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[]) {
    this.sdpOffer = sdpOffer;
    this.iceServers = iceServers || [];
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

    this.dataChannels = [];
    this.pc.ondatachannel = (e) => {
      console.log(`[${this.resourceId}]: datachannel=${e.channel.label}`);
      if (e.channel.label === "backchannel") {
        this.ondatachannel(e.channel);
      }
      this.dataChannels.push(e.channel);
    }
  }

  protected log(...args: any[]) {
    console.log(`[${this.resourceId}]:`, ...args);
  }

  protected onIceConnectionStateChange(e) {
    this.log(`${this.pc.iceConnectionState}`);
  }

  async beforeAnswer() { }

  async sdpAnswer(): Promise<string> {
    this.log("Received offer from sender");

    await this.pc.setRemoteDescription({
      type: "offer",
      sdp: this.sdpOffer,
    });
    this.remoteSdp = this.sdpOffer;
    const parsedOffer: SessionDescription | undefined = this.remoteSdp && parse(this.remoteSdp);
    if (parsedOffer && parsedOffer.iceUfrag && parsedOffer.icePwd) {
      this.iceCredentials = {
        pwd: parsedOffer.icePwd,
        ufrag: parsedOffer.iceUfrag
      };

    } else if (parsedOffer &&
      parsedOffer.media.length !== 0 &&
      parsedOffer.media[0].iceUfrag &&
      parsedOffer.media[0].icePwd) {

      this.iceCredentials = {
        pwd: parsedOffer.media[0].icePwd,
        ufrag: parsedOffer.media[0].iceUfrag
      };
    }

    this.log(`ICE credentials ${JSON.stringify(this.iceCredentials)}`);

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

  async ondatachannel(datachannel) {

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
    switch (this.pc.connectionState) {
      case "connected":
        await this.onconnect(this.pc.connectionState);
        break;
      case "disconnected":
        break;
      case "failed":
        await this.ondisconnect(this.pc.connectionState);
        this.destroy();
        break;
      case "closed":
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

  async patch(body: string): Promise<number> {
    const parsedSdp = parse(body);

    if (!parsedSdp || 
      parsedSdp.media.length === 0 || 
      !parsedSdp.media[0].candidates || 
      parsedSdp.media[0].candidates.length === 0) {

      this.log(`Malformed patch content: ${body}`);
      return Promise.reject(400);
    }

    const searchResult = body.match(/a=candidate.*\r\n/);
    if (searchResult.length === 1) {
      const candidateString = searchResult[0];
      this.log(`Got remote ICE candidate ${candidateString}`);
      await this.pc.addIceCandidate({candidate: candidateString});
    }

    return Promise.resolve(204);
  }

  destroy() {
    this.log("Destroy requested and closing peer");
    this.dataChannels.forEach(dc => dc.close());
    this.pc.close();
  }
}
