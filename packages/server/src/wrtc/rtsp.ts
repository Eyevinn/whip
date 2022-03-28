import { WHIPResource } from "../models/WHIPResource";
import { MPEGTS } from "../transform/mpegts";

import ffmpeg from "fluent-ffmpeg";

export class RTSPResolution {
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  toString() {
    return this.width + "x" + this.height;
  }
}

interface WRTCRTSPOptions {
  server: string;
  resolution: RTSPResolution;
}

export class WRTCRTSP extends WHIPResource {
  private rtspServer: string;
  private output;
  private outputResolution: RTSPResolution;

  constructor(sdpOffer: string, opts?: WRTCRTSPOptions) {
    super(sdpOffer);
    this.rtspServer = "rtsp://127.0.0.1:8554";
    this.outputResolution = new RTSPResolution(960, 540);
    if (opts && opts.server) {
      this.rtspServer = opts.server;
    }
    if (opts && opts.resolution) {
      this.outputResolution = opts.resolution;
    }
  }

  getOutputPath() {
    return this.rtspServer + "/" + this.getId();
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
      .format("rtsp")
    return proc;
  }

  async beforeAnswer() {
    const mpegTsTransform = new MPEGTS(this.pc, this.getId());
    this.output = this.createOutputStream(mpegTsTransform);
    this.output.run();
  }

  getType() {
    return "rtsp";
  }

  asObject(): any {
    return {
      rtsp: this.getOutputPath()
    }
  }
}