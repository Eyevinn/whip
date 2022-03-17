import { WHIPClient } from "@eyevinn/whip-web-client";

async function previewChannel(channelUrl, video) {
  if (channelUrl) {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
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

window.addEventListener("DOMContentLoaded", async () => {
  const input = document.querySelector<HTMLInputElement>("#whip-endpoint");
  const videoIngest = document.querySelector<HTMLVideoElement>("video#ingest");
  const watchChannel = document.querySelector<HTMLAnchorElement>("a#watch-channel");

  input.value = `http://${window.location.hostname}:8000/api/v1/whip/broadcaster`

  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      const client = new WHIPClient({ 
        endpoint: input.value,
        element: videoIngest,
        opts: { debug: true },
      });

      await client.connect();
      const resourceUri = await client.getResourceUri();
      const response = await fetch("http://localhost:8000" + resourceUri);
      const json = await response.json();

      await previewChannel(json.channel, document.querySelector<HTMLVideoElement>("video#preview"));

      watchChannel.href = `watch.html?locator=${encodeURIComponent(json.channel)}`;
      watchChannel.classList.remove("hidden");
    });
});
