import { WHIPResource } from "../models/WHIPResource";
import { nonstandard as WRTCNonstandard } from "wrtc";
import { PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";

import { createServer } from "net";
import path from "path";
import { fstat, statSync, unlink, unlinkSync } from "fs";

const { RTCVideoSink, RTCAudioSink } = WRTCNonstandard;

class UnixStream {
  private locator: string;

  constructor(stream, id, onSocket) {
    const socketPath = path.resolve("/tmp/", id + ".sock");
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

function StreamInput(stream, id) {
  return new UnixStream(stream, id, (socket) => {
    stream.on("error", (err) => {
      console.log(`INPUT(${id}):` + err.message);
    });
    socket.on("error", (err) => {
      console.log(`OUTPUT(${id}):` + err.message);
    })
    stream.pipe(socket);
  });
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

  createStream(streamId, audioSink) {
    const stream = {
      streamId: streamId,
      video: new PassThrough(),
      audio: new PassThrough(),
      proc: null,
    };

    const onAudioData = ({ samples: { buffer }}) => {
      stream.audio.push(Buffer.from(buffer));
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
      .addInput(StreamInput(stream.video, this.getId() + "-v").url)
      .addInputOptions([
        "-f", "rawvideo",
        "-pix_fmt", "yuv420p",
        "-s", stream.streamId,
        "-r", "30",
      ])
      .addInput(StreamInput(stream.audio, this.getId() + "-a").url)
      .addInputOptions([
        "-f s16le",
        "-ar 48k",
        "-ac 2",
      ])
      .on("start", (cmdLine) => {
        console.log("Restreaming started >> " + this.rtspServer + "/" + this.getId());
        console.log(cmdLine);
      })
      .on("codecData", (data) => {
        console.log(data);
      })
      .on("end", () => {
        console.log("Restreaming stopped >> " + this.rtspServer + "/" + this.getId());
      })
      .on("error", (err) => {
        console.log(`Failed to process video for ${this.getId()}: ` + err.message);
      })
      .size(stream.streamId)
      .output(this.rtspServer + "/" + this.getId())
      .addOutputOptions([
        "-rtsp_transport tcp",
        "-x264-params min-keyint=30",
        "-g 30"
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("rtsp");

    stream.proc.run();
    return stream;
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
        stream = this.createStream(streamId, audioSink);
      }
      stream.video.push(Buffer.from(data));
    });

    const { close } = this.pc;
    this.pc.close = () => {
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