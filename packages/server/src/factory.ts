import { WHIPResourceICEServer } from "./models/WHIPResource";
import { WRTCBroadcaster } from "./wrtc/broadcaster";
import { WRTCDummy } from "./wrtc/dummy";
import { WRTCRTMP } from "./wrtc/rtmp";
import { WRTCRTSP, RTSPResolution } from "./wrtc/rtsp";

export interface WHIPResourceParams {
  channelId?: string;
  b64json?: string;
}

export const createWHIPResourceFromType = (type: string, params: WHIPResourceParams, sdpOffer: string, enabledPlugins: string[], iceServers?: WHIPResourceICEServer[]) => {
  if (!enabledPlugins.includes(type)) {
    console.error(`Requested plugin '${type}' that is not enabled`);
    throw new Error(`Requested plugin '${type}' that is not enabled`);
    return;
  }

  switch (type) {
    case "dummy":
      return new WRTCDummy(sdpOffer, iceServers);
    case "broadcaster":
      return new WRTCBroadcaster(sdpOffer, iceServers, { channelId: params?.channelId });
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
    case "rtmp":
      if (!params || !params.b64json) {
        throw new Error(`Missing base64 json payload`);
      }
      const payload = JSON.parse(Buffer.from(params.b64json, "base64").toString());
      const [ width, height ] = payload.resolution ? payload.resolution.split("x") : [ 960, 540 ];
      return new WRTCRTMP(sdpOffer, iceServers, { rtmpUrl: payload.rtmpUrl, width: width, height: height });
    default:
      throw new Error(`Failed to create resource, reason: Invalid resource type '${type}'`);
  }
}