import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RTCPeerConnection } from "wrtc";

const waitUntilIceGatheringStateComplete = async (peer: RTCPeerConnection) => {
  if (peer.iceGatheringState === "complete") {
    return;
  }

  const p: Promise<void> = new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      peer.removeEventListener("icecandidate", onIceCandidate);
      reject(new Error("Timed out waiting for host candidates"));
    }, 2000);
    const onIceCandidate = ({ candidate }) => {
      if (!candidate) {
        clearTimeout(t);
        peer.removeEventListener("icecandidate", onIceCandidate);
        console.log(`SFU PEER: ICE candidates gathered: state=${peer.iceConnectionState}`);
        resolve();
      }  
    };
    peer.addEventListener("icecandidate", onIceCandidate);
  });
  await p;
}

export default function(fastify: FastifyInstance, opts, done) {

  fastify.post("/channel/:channelId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const peer = new RTCPeerConnection({
        sdpSemantics: "unified-plan"
      });
      peer.oniceconnectionstatechange = () => console.log("SFU PEER: " + peer.iceConnectionState);

      const remoteSdp = request.body.sdp;
      await peer.setRemoteDescription({ 
        type: "offer", 
        sdp: remoteSdp 
      });

      const stream = opts.instance.getStreamForChannel(request.params.channelId);
      for (const track of stream.getTracks()) {
        console.log("SFU PEER: Added track: " + track.kind);
        peer.addTrack(track, stream);
      }

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitUntilIceGatheringStateComplete(peer);

      reply.code(200).send(answer);
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  done();
}