import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export default function(fastify: FastifyInstance, opts, done) {
  fastify.post("/whip", {}, async (request: FastifyRequest, reply: FastifyReply) => {

  });

  fastify.delete("/whip/:resourceId", {}, async (request: FastifyRequest, reply: FastifyReply) => {

  });

  done();
}