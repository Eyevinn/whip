import { nonstandard as WRTCNonstandard } from "wrtc";
import { WHIPResource } from "../models/WHIPResource";

const { RTCVideoSink, RTCAudioSink } = WRTCNonstandard;

export class WRTCDummy extends WHIPResource {
  constructor(sdpOffer: string) {
    super(sdpOffer);

  }

  async beforeAnswer() {
    const videoSink = new RTCVideoSink(this.videoTransceiver.receiver.track);
    const audioSink = new RTCAudioSink(this.audioTransceiver.receiver.track);
    videoSink.addEventListener("frame", ({ frame }) => {
      console.log(frame.width, frame.height);
    });
    audioSink.addEventListener("data", ({ samples: { buffer } }) => {

    });  
  }

  getType() {
    return "dummy";
  }
}