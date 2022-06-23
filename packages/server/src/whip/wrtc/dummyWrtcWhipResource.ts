import { nonstandard as WRTCNonstandard } from "wrtc";
import { WrtcWhipResource } from "./wrtcWhipResource";
import { WhipResourceIceServer } from "../whipResource";

const { RTCVideoSink, RTCAudioSink } = WRTCNonstandard;

export class DummyWrtcWhipResource extends WrtcWhipResource {
  constructor(sdpOffer: string, iceServers?: WhipResourceIceServer[]) {
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
