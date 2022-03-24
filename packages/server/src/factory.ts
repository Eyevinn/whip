import { WHIPResource } from "./models/WHIPResource";
import { WRTCBroadcaster } from "./wrtc/broadcaster";
import { WRTCDummy } from "./wrtc/dummy";
import { WRTCRTSP } from "./wrtc/rtsp";

export const createWHIPResourceFromType = (type: string, sdpOffer: string) => {
  switch (type) {
    case "dummy":
      return new WRTCDummy(sdpOffer);
    case "broadcaster":
      return new WRTCBroadcaster(sdpOffer);
    case "rtsp":
      let opts = null;
      if (process.env.RTSP_SERVER) {
        opts = {};
        opts.server = process.env.RTSP_SERVER;
      }
      return new WRTCRTSP(sdpOffer, opts);
    default:
      throw new Error(`Failed to create resource, reason: Invalid resource type '${type}'`);
  }
}