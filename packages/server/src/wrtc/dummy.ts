import { nonstandard as WRTCNonstandard } from "wrtc";
import { WHIPResource } from "../models/WHIPResource";

const { RTCVideoSink } = WRTCNonstandard;

export class WRTCDummy extends WHIPResource {
  constructor(sdpOffer: string) {
    super(sdpOffer);

  }

  async beforeOffer() {
    this.pc.ontrack = async ({ track }) => {
      this.pc.addTrack(track);
      const videoSink = new RTCVideoSink(track);
      videoSink.addEventListener("frame", ({ frame }) => {
        // console.log(frame.width, frame.height);
      })
    };
  }

  getType() {
    return "dummy";
  }
}
