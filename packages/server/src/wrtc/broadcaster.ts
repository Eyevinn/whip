import { MediaStream } from "wrtc";
import { WHIPResource } from "../models/WHIPResource";

export class WRTCBroadcaster extends WHIPResource {

  constructor(sdpOffer: string) {
    super(sdpOffer);
  }

  async beforeAnswer() {
    const stream = new MediaStream(this.pc.getReceivers().map(receiver => receiver.track));

    if (this.broadcaster) {
      this.broadcaster.createChannel(this.getId(), stream);
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