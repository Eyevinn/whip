import { WHIPClientIceServer } from "@eyevinn/whip-web-client";
import { WebRTCPlayer } from "@eyevinn/webrtc-player";

export async function watch(channelUrl, video) {
  if (channelUrl) {
    let adapterType = "se.eyevinn.webrtc";
    try {
      const response = await fetch(channelUrl, { method: "OPTIONS" });
      if (response.ok && response.headers.get("Accept")) {
        const acceptTypes = response.headers.get("Accept").split(",").map(v => v.trimStart());
        if (acceptTypes.includes("application/whpp+json")) {
          adapterType = "se.eyevinn.whpp";
        } else {
          adapterType = "se.eyevinn.webrtc";
        }
      }
    } catch (err) {
      console.error(err);
      console.log("Could not determine type, falling back to legacy");
    }

    const player = new WebRTCPlayer({ 
      video: video, 
      type: adapterType, 
      iceServers: getIceServers(), 
      createDataChannels: [ "reactions", "broadcaster" ],
    });
    await player.load(new URL(channelUrl));
    return player;
  }
}

export async function getViewerCount(channelUrl): Promise<number> {
  const response = await fetch(channelUrl);
  if (response.ok) {
    const json = await response.json();
    return json.viewers;
  }
  return -1;
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
