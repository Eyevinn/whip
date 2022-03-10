import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createWHIPResourceFromType } from "./factory";

export default function(fastify: FastifyInstance, opts, done) {
  fastify.addContentTypeParser('application/sdp', { parseAs: "string" }, (req, body, done) => {
    done(null, body);
  })

  fastify.post("/whip/:type", {}, async (request: any, reply: FastifyReply) => {
    try {
      const type = request.params.type;
      const resource = createWHIPResourceFromType(type, <string>request.body);
      opts.instance.addResource(resource);

      const sdpAnswer = await resource.sdpAnswer();
      reply.code(201).headers({
        "Content-Type": "application/sdp",
        "Location": opts.prefix + "/whip/" + type + "/" + resource.getId(),
      }).send(sdpAnswer);
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/whip", {}, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      reply.code(200).send(opts.instance.listResources().map(r => opts.prefix + "/whip/" + r.type + "/" + r.id));
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.delete("/whip/:type/:resourceId", {}, async (request: FastifyRequest, reply: FastifyReply) => {

  });

  done();
}