import { MediaStream } from "wrtc";
import { WHIPResource, WHIPResourceICEServer } from "../models/WHIPResource";

export class WRTCBroadcaster extends WHIPResource {

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[]) {
    super(sdpOffer, iceServers);
  }

  onIceConnectionStateChange(e) {
    if (this.pc.iceConnectionState === "closed") {
      this.destroy();
      this.broadcaster.removeChannel(this.getId());
    }
  }

  async beforeAnswer() {
    const stream = new MediaStream(this.pc.getReceivers().map(receiver => receiver.track));

    if (this.broadcaster) {
      this.broadcaster.createChannel(this.getId(), stream);
    }
  }

  async ondatachannel(datachannel) {
    if (datachannel.label === "backchannel") {
      this.broadcaster.assignBackChannel(this.getId(), datachannel);
    }
  }

  async ondisconnect() {
    if (this.broadcaster) {
      this.broadcaster.removeChannel(this.getId());
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