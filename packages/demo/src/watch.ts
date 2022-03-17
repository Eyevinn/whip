async function watchChannel(channelUrl, video) {
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
    const remoteStream = new MediaStream(peer.getReceivers().map(receiver => receiver.track));
    video.srcObject = remoteStream;

    const sdpOffer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    peer.setLocalDescription(sdpOffer);

  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const searchParams = new URL(window.location.href).searchParams;
  const locator = searchParams.get("locator");

  if (locator) {
    await watchChannel(locator, document.querySelector<HTMLVideoElement>("video"))
  }
}); 
