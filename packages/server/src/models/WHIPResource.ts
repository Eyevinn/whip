import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from 'uuid';

// Abstract base class

export class WHIPResource {
  protected sdpOffer: string;
  protected pc: RTCPeerConnection;
  protected videoTransceiver;
  private resourceId: string;

  constructor(sdpOffer: string) {
    this.sdpOffer = sdpOffer;
    this.pc = new RTCPeerConnection({
      sdpSemantics: "unified-plan"
    });
    this.pc.oniceconnectionstatechange = e => console.log(this.pc.iceConnectionState);

    this.resourceId = uuidv4();
    // this.videoTransceiver = this.pc.addTransceiver("video");
  }

  async beforeOffer() {

  }

  async sdpAnswer() {
    await this.beforeOffer();
    await this.pc.setRemoteDescription({
      type: "offer",
      sdp: this.sdpOffer
    });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer.sdp;
  }

  getId() {
    return this.resourceId;
  }

  getType() {
    return "base";
  }
}