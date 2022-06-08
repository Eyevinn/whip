import { WRTCWHIPResource } from "./WRTCWHIPResource";
import { WHIPResourceICEServer, IANA_PREFIX } from "../models/WHIPResource";
import { MPEGTS, MPEGTSResolution } from "../transform/mpegts";

import ffmpeg from "fluent-ffmpeg";

interface WRTCRTMPOptions {
  rtmpUrl: string;
  width: number;
  height: number;
}

export class WRTCRTMP extends WRTCWHIPResource {
  private rtmpUrl: string;
  private width: number;
  private height: number;
  private output;

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[], opts?: WRTCRTMPOptions) {
    super(sdpOffer, iceServers);
    this.rtmpUrl = opts.rtmpUrl;
    this.width = opts.width;
    this.height = opts.height;
  }

  getOutputPath() {
    return this.rtmpUrl;
  }

  createOutputStream(transform: MPEGTS) {
    const proc = ffmpeg()
      .addInput(transform.getInput())
      .on("start", (cmdLine) => {
        console.log("Restreaming started " + this.getOutputPath());
        console.log(cmdLine);
      })
      .on("end", () => {
        console.log("Restreaming stopped " + this.getOutputPath());
      })
      .on("error", (err) => {
        console.log(`Failed to process video for ${this.getId()}: ` + err.message);
      })
      .output(this.getOutputPath())
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("flv")
    return proc;
  }

  async beforeAnswer() {
    const mpegTsTransform = new MPEGTS(this.pc, this.getId(), { 
      outputResolution: new MPEGTSResolution(this.width, this.height) 
    });
    this.output = this.createOutputStream(mpegTsTransform);
    this.output.run();
  }

  getType() {
    return "rtmp";
  }

  getProtocolExtensions(): string[] {
    return [
      `<${this.getOutputPath()}>;rel=${IANA_PREFIX}eyevinn-wrtc-rtmp`,
    ]
  }

  asObject(): any {
    return {
      rtmpUrl: this.getOutputPath()
    }
  }  
}