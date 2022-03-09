window.addEventListener("DOMContentLoaded", () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      document.querySelector<HTMLVideoElement>("video").srcObject = stream;
      const sdpOffer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      pc.setLocalDescription(sdpOffer);
      
      pc.ontrack = event => {
        const el = document.querySelector<HTMLVideoElement>("video");
        el.srcObject = event.streams[0];
        el.autoplay = true;
        el.controls = true;
      }
    });  
});
