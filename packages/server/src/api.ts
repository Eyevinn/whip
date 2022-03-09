import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WHIPResource } from "./models/WHIPResource";
import fetch from "node-fetch";

export default function(fastify: FastifyInstance, opts, done) {
  fastify.addContentTypeParser('application/sdp', async (request, payload) => {
    return request.body;
  })

  fastify.post("/whip", {}, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log(request.body);
      // This should of course be modularized
      /*
      const pionSdpOffer = { type: "offer", sdp: request.body };
      const response = await fetch("http://localhost:8080/sdp", {
        method: "POST",
        body: JSON.stringify(pionSdpOffer)
      });
      const data = await response.text();
      console.log(data);
      */
      reply.code(201).headers({
        "content-type": "application/sdp"
      }).send();
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.delete("/whip/:resourceId", {}, async (request: FastifyRequest, reply: FastifyReply) => {

  });

  done();
}