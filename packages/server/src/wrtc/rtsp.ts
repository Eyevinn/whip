import { WHIPResource } from "../models/WHIPResource";
import { nonstandard as WRTCNonstandard } from "wrtc";
import { PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import { StreamInput } from "fluent-ffmpeg-multistream";

const { RTCVideoSink, RTCAudioSink } = WRTCNonstandard;

export class WRTCRTSP extends WHIPResource {

  constructor(sdpOffer: string) {
    super(sdpOffer);
  }

  async beforeAnswer() {
    let videoSink;
    let audioSink;

    const streams = [];

    this.pc.getReceivers().forEach(({ track }) => {
      if (track.kind === "video") {
        videoSink = new RTCVideoSink(track);
      } else if(track.kind === "audio") {
        audioSink = new RTCAudioSink(track);
      }
    });

    videoSink.addEventListener("frame", ({ frame: { width, height, data }}) => {
      const streamId = width + "x" + height;
      if (!streams[0] || (streams[0] && streams[0].streamId !== streamId)) {
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

        streams.unshift(stream);

        streams.forEach(item => {
          if (item !== stream && !stream.end) {
            item.end = true;
            if (item.audio) {
              item.audio.end();
            }
            item.video.end();
          }
        });
        stream.proc = ffmpeg()
          .addInput((new StreamInput(stream.video)).url)
          .addInputOptions([
            "-f", "rawvideo",
            "-pix_fmt", "yuv420p",
            "-s", stream.streamId,
            "-r", "30",
          ])
          .addInput((new StreamInput(stream.audio)).url)
          .addInputOptions([
            "-f s16le",
            "-ar 48k",
            "-ac 1",
          ])
          .on("start", () => {
            console.log("Restreaming started");
          })
          .on("end", () => {
            console.log("Restreaming stopped");
          })
          .size("640x360")
          .output("udp://127.0.0.1:8888?pkt_size=1316")
          .videoCodec("libx264")
          .audioCodec("aac")
          .format("mpegts");

          stream.proc.run();
      }

      streams[0].video.push(Buffer.from(data));
    });

    const { close } = this.pc;
    this.pc.close = () => {
      audioSink.stop();
      videoSink.stop();

      streams.forEach(({ audio, video, end, proc }) => {
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
}