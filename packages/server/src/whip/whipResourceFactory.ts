import { WhipResourceIceServer, WhipResource } from "./whipResource";
import { SfuWhipResource } from "./sfu/sfuWhipResource";
import { RtmpWrtcWhipResource } from "./wrtc/rtmpWrtcWhipResource";
import { RtspWrtcWhipResource, RTSPResolution } from "./wrtc/rtspWrtcWhipResource";
import { SmbProtocol } from "../smb/smbProtocol";
import { BroadcasterClientSfuPair } from "../broadcasterClient"

export interface WHIPResourceParams {
  channelId?: string;
  b64json?: string;
}

export const createWHIPResourceFromType = (type: string, 
  params: WHIPResourceParams, 
  sdpOffer: string, 
  enabledPlugins: string[], 
  originSfuUrl: string, 
  broadcasterClientSfuPairs: BroadcasterClientSfuPair[], 
  iceServers?: WhipResourceIceServer[],
  sfuApiKey?: string): WhipResource => {

  if (!enabledPlugins.includes(type)) {
    console.error(`Requested plugin '${type}' that is not enabled`);
    throw new Error(`Requested plugin '${type}' that is not enabled`);
    return;
  }

  switch (type) {

    case "sfu-broadcaster":
      return new SfuWhipResource(() => new SmbProtocol(), originSfuUrl, broadcasterClientSfuPairs, sdpOffer, params?.channelId, sfuApiKey);

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
          const [width, height] = process.env.RTSP_RESOLUTION.split("x");
          opts.resolution = new RTSPResolution(parseInt(width, 10), parseInt(height, 10));
        } else {
          console.error("Invalid format for RTSP_RESOLUTION, will be using default");
        }
      }
      return new RtspWrtcWhipResource(sdpOffer, iceServers, opts);

    case "rtmp":
      if (!params || !params.b64json) {
        throw new Error(`Missing base64 json payload`);
      }
      const payload = JSON.parse(Buffer.from(params.b64json, "base64").toString());
      const [width, height] = payload.resolution ? payload.resolution.split("x") : [960, 540];
      return new RtmpWrtcWhipResource(sdpOffer, iceServers, { rtmpUrl: payload.rtmpUrl, width: width, height: height });

    default:
      throw new Error(`Failed to create resource, reason: Invalid resource type '${type}'`);
  }
}
