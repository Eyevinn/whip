import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export default function(fastify: FastifyInstance, opts, done) {

  fastify.post("/channel/:channelId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const peer = opts.instance.getPeerForChannel(request.params.channelId);
      const remoteSdp = request.body.sdp;
      await peer.setRemoteDescription({ type: "offer", sdp: remoteSdp });
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      reply.code(200).send({ sdp: answer });
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  done();
}