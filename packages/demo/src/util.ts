import { WHIPClientIceServer } from "@eyevinn/whip-web-client";

export async function watch(channelUrl, video) {
  if (channelUrl) {
    const peer = new RTCPeerConnection({
      iceServers: getIceServers(),
    });
    peer.oniceconnectionstatechange = () => console.log(`[Preview] ICE connection state: ${peer.iceConnectionState}`);
    peer.onicecandidate = async (event) => {
      if (event.candidate === null) {
        const response = await fetch(channelUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sdp: peer.localDescription.sdp })
        });
        const { sdp } = await response.json();
        peer.setRemoteDescription({ type: "answer", sdp: sdp });    
      }
    }
    peer.ontrack = (ev) => {
      if (ev.streams && ev.streams[0]) {
        video.srcObject = ev.streams[0];
      }
    };

    const sdpOffer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    peer.setLocalDescription(sdpOffer);

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