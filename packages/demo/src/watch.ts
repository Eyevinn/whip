window.addEventListener("DOMContentLoaded", async () => {
  const searchParams = new URL(window.location.href).searchParams;
  const locator = searchParams.get("locator");

  if (locator) {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    });
    peer.oniceconnectionstatechange = e => console.log(this.pc.iceConnectionState);

    const remoteVideo = document.querySelector<HTMLVideoElement>("video");

    const sdpOffer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    peer.setLocalDescription(sdpOffer);

    const response = await fetch(locator, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sdp: sdpOffer.sdp })
    });
    console.log("bwallberg remoteStream", response);
    const { sdp } = await response.json();
    console.log("bwallberg sdp");
    peer.setRemoteDescription({ type: "answer", sdp: sdp });
    console.log(peer.getReceivers());
    const remoteStream = new MediaStream(peer.getReceivers().map(receiver => receiver.track));
    console.log("bwallberg remoteStream", remoteStream);
    remoteVideo.srcObject = remoteStream;
  }
});