import { nonstandard as WRTCNonstandard } from "wrtc";
import { WHIPResource, WHIPResourceICEServer } from "../models/WHIPResource";

const { RTCVideoSink, RTCAudioSink } = WRTCNonstandard;

export class WRTCDummy extends WHIPResource {
  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[]) {
    super(sdpOffer, iceServers);

  }

  async beforeAnswer() {
    this.pc.getReceivers().map(({ track }) => {
      if (track.kind === "video") {
        const videoSink = new RTCVideoSink(track);
        videoSink.addEventListener("frame", ({ frame }) => {
          // console.log(frame.width, frame.height);
        }); 
      }
    });
  }

  getType() {
    return "dummy";
  }
}
