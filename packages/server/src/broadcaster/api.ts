import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RTCPeerConnection } from "wrtc";

const ICE_TRICKLE_TIMEOUT = process.env.ICE_TRICKLE_TIMEOUT ? parseInt(process.env.ICE_TRICKLE_TIMEOUT) : 4000;

const waitUntilIceGatheringStateComplete = async (peer: RTCPeerConnection) => {
  if (peer.iceGatheringState === "complete") {
    return;
  }

  const p: Promise<void> = new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      peer.removeEventListener("icecandidate", onIceCandidate);
      console.log("ICE gathering timed out, send what we have");
      resolve();
      //reject(new Error("Timed out waiting for host candidates"));
    }, ICE_TRICKLE_TIMEOUT);
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
      const iceServers = opts.instance.getIceServers();
      const peer = new RTCPeerConnection({
        sdpSemantics: "unified-plan",
        iceServers: iceServers,
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

  fastify.get("/channel", {}, async (request: any, reply: FastifyReply) => {
    try {
      const channels = opts.instance.getChannels();
      reply.code(200).send(channels.map(channelId => {
        return { channelId: channelId, resource: opts.instance.getBaseUrl() + "/channel/" + channelId };
      }));
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  done();
}