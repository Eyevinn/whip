import { WHIPResource } from "../models/WHIPResource";
import { nonstandard as WRTCNonstandard } from "wrtc";
import { PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";

import { createServer } from "net";
import path from "path";
import { fstat, statSync, unlink, unlinkSync } from "fs";

const { RTCVideoSink, RTCAudioSink } = WRTCNonstandard;

var counter = 0;

class UnixStream {
  private locator: string;

  constructor(stream, onSocket) {
    const socketPath = path.resolve("/tmp/", (++counter).toString() + ".sock");
    this.locator = "unix:" + socketPath;

    try {
      statSync(socketPath);
      unlinkSync(socketPath);
    } catch (err) {}
    let server;
    try {
      server = createServer(onSocket);
    } catch (err) {
      console.log(err);
    }
    stream.on("finish", () => {
      server.close();
    });
    stream.on("error", (err) => {
      console.log(err.message);
    });
    server.listen(socketPath);
  }

  get url() {
    return this.locator;
  }
}

function StreamInput(stream) {
  return new UnixStream(stream, (socket) => socket.pipe(stream));
}

interface WRTCRTSPOptions {
  server: string;
}

export class WRTCRTSP extends WHIPResource {
  private rtspServer: string;

  constructor(sdpOffer: string, opts?: WRTCRTSPOptions) {
    super(sdpOffer);
    this.rtspServer = "rtsp://127.0.0.1";
    if (opts && opts.server) {
      this.rtspServer = opts.server;
    }
  }

  async beforeAnswer() {
    let videoSink;
    let audioSink;

    this.pc.getReceivers().forEach(({ track }) => {
      if (track.kind === "video") {
        videoSink = new RTCVideoSink(track);
      } else if(track.kind === "audio") {
        audioSink = new RTCAudioSink(track);
      }
    });

    let stream = null;

    videoSink.addEventListener("frame", ({ frame: { width, height, data }}) => {
      const streamId = width + "x" + height;
      if (!stream) {
        stream = {
          streamId: streamId,
          video: new PassThrough(),
          audio: new PassThrough(),
          end: false,
          proc: null,
        };

        const onAudioData = ({ samples: { buffer }}) => {
          if (!stream.end) {
            stream.audio.push(Buffer.from(buffer));
          }
        };
        audioSink.addEventListener("data", onAudioData);
        stream.audio.on("end", () => {
          audioSink.removeEventListener("data", onAudioData);
        });

        stream.audio.on("error", (err) => {
          console.log("A:" + err.message);
        });
        stream.video.on("error", (err) => {
          console.log("V:" + err.message);
        });
        
        stream.proc = ffmpeg()
          .addInput(StreamInput(stream.video).url)
          .addInputOptions([
            "-f", "rawvideo",
            "-pix_fmt", "yuv420p",
            "-s", stream.streamId,
            "-r", "30",
          ])
          .addInput(StreamInput(stream.audio).url)
          .addInputOptions([
            "-f s16le",
            "-ar 48k",
            "-ac 1",
          ])
          .on("start", (cmdLine) => {
            console.log("Restreaming started >> " + this.rtspServer + "/" + this.getId());
            console.log(cmdLine);
          })
          .on("end", () => {
            console.log("Restreaming stopped >> " + this.rtspServer + "/" + this.getId());
          })
          .on("error", (err) => {
            console.log(`Failed to process video for ${this.getId()}: ` + err.message);
          })
          .on("progress", ({ currentFps, frames }) => {
            console.log(`${this.getId()}: currentFps=${currentFps} (${frames} processed)`);
          })
          .size("640x360")
          .output(this.rtspServer + "/" + this.getId())
          .addOutputOptions(["-rtsp_transport tcp"])
          .videoCodec("libx264")
          .audioCodec("aac")
          .format("rtsp");
  
        stream.proc.run();
      }
      stream.video.push(Buffer.from(data));
    });

    const { close } = this.pc;
    this.pc.close = () => {
      console.log("Peer closed, stopping audio and video sink");

      audioSink.stop();
      videoSink.stop();

      stream.audio.end();
      stream.video.end();
      return close.apply(this, arguments);
    }
  }

  getType() {
    return "rtsp";
  }

  asObject(): any {
    return {
      rtsp: `${this.rtspServer}/${this.getId()}`,
    }
  }
}