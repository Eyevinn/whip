import { WrtcWhipResource } from "./wrtcWhipResource";
import { MPEGTS, MPEGTSResolution } from "../../transform/mpegts";
import { WhipResourceIceServer, IANA_PREFIX } from "../whipResource";

import ffmpeg from "fluent-ffmpeg";

export class RTSPResolution {
  private _width: number;
  private _height: number;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  toString() {
    return this._width + "x" + this._height;
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }
}

interface RtspWrtcWhipResourceOptions {
  server: string;
  resolution: RTSPResolution;
}

export class RtspWrtcWhipResource extends WrtcWhipResource {
  private rtspServer: string;
  private output;
  private outputResolution: RTSPResolution;

  constructor(sdpOffer: string, iceServers?: WhipResourceIceServer[], opts?: RtspWrtcWhipResourceOptions) {
    super(sdpOffer, iceServers);
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
    const mpegTsTransform = new MPEGTS(this.pc, this.getId(), { 
      outputResolution: new MPEGTSResolution(this.outputResolution.width, this.outputResolution.height) 
    });
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
