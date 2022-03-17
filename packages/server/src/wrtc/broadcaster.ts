import { RTCPeerConnection } from "wrtc";
import { WHIPResource } from "../models/WHIPResource";

export class WRTCBroadcaster extends WHIPResource {
  private sfuPeer: RTCPeerConnection;

  constructor(sdpOffer: string) {
    super(sdpOffer);
    this.sfuPeer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    this.sfuPeer.oniceconnectionstatechange = e => console.log("SFU PEER: " + this.sfuPeer.iceConnectionState);
  }

  async beforeAnswer() {
    this.pc.getReceivers().map(({ track }) => {
      this.sfuPeer.addTrack(track);
    });
    if (this.broadcaster) {
      this.broadcaster.createChannel(this.getId(), this.sfuPeer);
    }
  }

  getType() {
    return "broadcaster";
  }

  asObject(): any {
    return {
      channel: `${this.broadcaster.getBaseUrl()}/channel/${this.getId()}`,
    }
  }
}