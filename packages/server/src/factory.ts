import { WHIPResourceICEServer } from "./models/WHIPResource";
import { WRTCBroadcaster } from "./wrtc/broadcaster";
import { WRTCDummy } from "./wrtc/dummy";
import { WRTCRTSP, RTSPResolution } from "./wrtc/rtsp";

export const createWHIPResourceFromType = (type: string, sdpOffer: string, iceServers?: WHIPResourceICEServer[]) => {
  switch (type) {
    case "dummy":
      return new WRTCDummy(sdpOffer, iceServers);
    case "broadcaster":
      return new WRTCBroadcaster(sdpOffer, iceServers);
    case "rtsp":
      let opts = null;
      if (process.env.RTSP_SERVER || process.env.RTSP_RESOLUTION) {
        opts = {};
        if (process.env.RTSP_SERVER && process.env.RTSP_SERVER.match(/^rtsp:\/\//)) { 
          opts.server = process.env.RTSP_SERVER;
        } else {
          console.error("Invalid format for RTSP_SERVER variable, will be using default");
        }
        if (process.env.RTSP_RESOLUTION && process.env.RTSP_RESOLUTION.match(/^\d+x\d+/)) {
          const [ width, height ] = process.env.RTSP_RESOLUTION.split("x");
          opts.resolution = new RTSPResolution(parseInt(width, 10), parseInt(height, 10));
        } else {
          console.error("Invalid format for RTSP_RESOLUTION, will be using default");
        }
      }
      return new WRTCRTSP(sdpOffer, iceServers, opts);
    default:
      throw new Error(`Failed to create resource, reason: Invalid resource type '${type}'`);
  }
}