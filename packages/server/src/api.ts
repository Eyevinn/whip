import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WHIPResource } from "./models/WHIPResource";
import fetch from "node-fetch";

export default function(fastify: FastifyInstance, opts, done) {
  fastify.addContentTypeParser('application/sdp', { parseAs: "string" }, (req, body, done) => {
    done(null, body);
  })

  fastify.post("/whip", {}, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // This should of course be modularized
      const pionSdpOffer = { type: "offer", sdp: request.body };
      const pionSdpOfferb64 = Buffer.from(JSON.stringify(pionSdpOffer), "ascii").toString("base64");
      const response = await fetch("http://localhost:8080/sdp", {
        method: "POST",
        body: pionSdpOfferb64
      });
      const pionSdpAnswerb64 = await response.text();
      console.log(pionSdpAnswerb64);
      const buf = Buffer.from(pionSdpAnswerb64, "base64");
      const pionSdpAnswer = JSON.parse(buf.toString("ascii"))
      reply.code(201).headers({
        "content-type": "application/sdp"
      }).send(pionSdpAnswer);
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.delete("/whip/:resourceId", {}, async (request: FastifyRequest, reply: FastifyReply) => {

  });

  done();
}