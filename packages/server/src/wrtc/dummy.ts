import { nonstandard as WRTCNonstandard } from "wrtc";
import { WHIPResource } from "../models/WHIPResource";

const { RTCVideoSink } = WRTCNonstandard;

export class WRTCDummy extends WHIPResource {
  constructor(sdpOffer: string) {
    super(sdpOffer);

  }

  async beforeOffer() {
    const videoSink = new RTCVideoSink(this.videoTransceiver.receiver.track);    
    videoSink.addEventListener("frame", ({ frame: { width, height, data }}) => {
    });
  }
}