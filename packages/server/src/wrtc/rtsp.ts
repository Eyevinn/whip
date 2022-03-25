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

var INTER_PORT = 9000;

export class WRTCRTSP extends WHIPResource {
  private rtspServer: string;
  private streams;
  private interPort: number;
  private output;

  constructor(sdpOffer: string, opts?: WRTCRTSPOptions) {
    super(sdpOffer);
    this.rtspServer = "rtsp://127.0.0.1:8554";
    if (opts && opts.server) {
      this.rtspServer = opts.server;
    }
    this.streams = [];
    this.interPort = ++INTER_PORT;
  }

  getOutputPath() {
    return this.rtspServer + "/" + this.getId();
  }

  createStream(streamId, audioSink) {
    const stream = {
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
      .addInput(StreamInput(stream.video, this.getId() + `-${stream.streamId}-v`).url)
      .addInputOptions([
        "-f", "rawvideo",
        "-pix_fmt", "yuv420p",
        "-s", stream.streamId,
        "-r", "30",
      ])
      .addInput(StreamInput(stream.audio, this.getId() + `-${stream.streamId}-a`).url)
      .addInputOptions([
        "-f s16le",
        "-ar 48k",
        "-ac 2",
      ])
      .on("start", (cmdLine) => {
        console.log(stream.streamId + ":Inter stream started " + this.interPort);
        //console.log(cmdLine);
      })
      .on("end", () => {
        console.log(stream.streamId + ":Inter stream stopped " + this.interPort);
      })
      .on("error", (err) => {
        console.log(stream.streamId + `Failed to process video for ${this.interPort}: ` + err.message);
      })
      .size("960x540")
      .output(`udp://127.0.0.1:${this.interPort}?pkt_size=1316`)
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("mpegts");

    return stream;
  }

  createOutputStream() {
    const proc = ffmpeg()
      .addInput(`udp://127.0.0.1:${this.interPort}?pkt_size=1316`)
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
    let videoSink;
    let audioSink;

    this.pc.getReceivers().forEach(({ track }) => {
      if (track.kind === "video") {
        videoSink = new RTCVideoSink(track);
      } else if(track.kind === "audio") {
        audioSink = new RTCAudioSink(track);
      }
    });

    this.streams = [];

    videoSink.addEventListener("frame", ({ frame: { width, height, data }}) => {
      const streamId = width + "x" + height;
      if (!this.streams[0] || (this.streams[0] && this.streams[0].streamId !== streamId)) {
        // A new frame size has arrived we need to create a new stream and stop
        // the others.
        const stream = this.createStream(streamId, audioSink);
        this.streams.unshift(stream);
        this.streams.forEach(item => {
          if (item !== stream && !item.end) {
            item.end = true;
            if (item.audio) {
              item.audio.end();
            }
            item.video.end();
          }
        });
        stream.proc.run();
      }
      this.streams[0].video.push(Buffer.from(data));
    });

    this.output = this.createOutputStream();
    this.output.run();

    const { close } = this.pc;
    this.pc.close = () => {
      audioSink.stop();
      videoSink.stop();
      this.streams.forEach(({ audio, video, end, }) => {
        if (!end) {
          if (audio) {
            audio.end();
          }
          video.end();
        }
      });
      return close.apply(this, arguments);
    }
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