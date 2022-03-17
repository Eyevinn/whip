import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RTCPeerConnection } from "wrtc";

export default function(fastify: FastifyInstance, opts, done) {

  fastify.post("/channel/:channelId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302'
          }
        ]
      });
      peer.oniceconnectionstatechange = e => console.log("SFU PEER: " + peer.iceConnectionState);


      const remoteSdp = request.body.sdp;
      await peer.setRemoteDescription({ type: "offer", sdp: remoteSdp });
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      const stream = opts.instance.getStreamForChannel(request.params.channelId);
      for (const track of stream.getTracks()) {
        console.log("Added track: " + track.kind);
        peer.addTrack(track, stream);
      }


      reply.code(200).send(answer);
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  done();
}