window.addEventListener("DOMContentLoaded", () => {
  const videoSender = document.querySelector<HTMLVideoElement>("video#sender");
  const videoReceiver = document.querySelector<HTMLVideoElement>("video#receiver");

  document.querySelector<HTMLButtonElement>("#start-session")
    .addEventListener("click", async () => {
      // This below will be part of a client SDK
      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302'
          }
        ]
      });
      pc.oniceconnectionstatechange = e => console.log(pc.iceConnectionState);
      pc.onicecandidate = async (event) => {
        if (event.candidate === null) {
          const whipEndpointUrl = document.querySelector<HTMLInputElement>("#whip-endpoint").value;
          const response = await fetch(whipEndpointUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/sdp"
            },
            body: pc.localDescription.sdp
          });
          const answer = await response.text();
          pc.setRemoteDescription({
            type: "answer",
            sdp: answer,
          });
        }
      }


      const streamSender = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamSender.getTracks().forEach(track => pc.addTrack(track, streamSender));
      videoSender.srcObject = streamSender;

      const streamReceiver = new MediaStream(pc.getReceivers().map(receiver => receiver.track));
      videoReceiver.srcObject = streamReceiver;

      const sdpOffer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true,
      });
      pc.setLocalDescription(sdpOffer);
      
    });  
});
