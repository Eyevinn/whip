import { WHIPClientIceServer } from "@eyevinn/whip-web-client";
import { WebRTCPlayer } from "@eyevinn/webrtc-player";

export async function watch(channelUrl, video) {
  if (channelUrl) {
    const player = new WebRTCPlayer({ video: video, type: "se.eyevinn.webrtc", iceServers: getIceServers() });
    await player.load(new URL(channelUrl));
  }
}

export function getIceServers(): WHIPClientIceServer[] {
  let iceServers: WHIPClientIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  if (process.env.ICE_SERVERS) {
    iceServers = [];
    process.env.ICE_SERVERS.split(",").forEach(server => {
      // turn:<username>:<password>@turn.eyevinn.technology:3478
      const m = server.match(/^turn:(\S+):(\S+)@(\S+):(\d+)/);
      if (m) {
        const [ _, username, credential, host, port ] = m;
        iceServers.push({ urls: "turn:" + host + ":" + port, username: username, credential: credential });
      }
    });
  }

  return iceServers;
}