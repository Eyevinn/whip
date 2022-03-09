import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WRTCDummy } from "./wrtc/dummy";

export default function(fastify: FastifyInstance, opts, done) {
  fastify.addContentTypeParser('application/sdp', { parseAs: "string" }, (req, body, done) => {
    done(null, body);
  })

  fastify.post("/whip", {}, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dummy = new WRTCDummy(<string>request.body);
      opts.instance.addResource(dummy);

      const sdpAnswer = await dummy.sdpAnswer();
      reply.code(201).headers({
        "Content-Type": "application/sdp",
        "Location": opts.prefix + "/whip/" + dummy.getId(),
      }).send(sdpAnswer);
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/whip", {}, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      reply.code(200).send(opts.instance.listResources().map(id => opts.prefix + "/whip/" + id));
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.delete("/whip/:resourceId", {}, async (request: FastifyRequest, reply: FastifyReply) => {

  });

  done();
}