import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createWHIPResourceFromType } from "./factory";
import { WHIPResourceICEServer } from "./models/WHIPResource";

export default function(fastify: FastifyInstance, opts, done) {
  const API_KEY = process.env.NODE_ENV === "development" ? "devkey" : process.env.API_KEY;

  const addIceLinks = (iceServers: WHIPResourceICEServer[], request: any, reply: FastifyReply) => {
    if (API_KEY && iceServers.length > 0 && request.headers["authorization"] === API_KEY) {
      // Only include ICE server config when provided authorization key is correct
      iceServers.forEach((ice) => {
        let iceLink = ice.urls + ";";
        iceLink += ` rel="ice-server";`;
        if (ice.username) {
          iceLink += ` username="${ice.username}";`;
        }
        if (ice.credential) {
          iceLink += ` credential: "${ice.credential}"; credential-type: "password";`;
        }
        reply.header("Link", iceLink);
      });
    }
  };

  fastify.addContentTypeParser('application/sdp', { parseAs: "string" }, (req, body, done) => {
    done(null, body);
  })

  fastify.post("/whip/:type", {}, async (request: any, reply: FastifyReply) => {
    try {
      const type = request.params.type;
      const resource = createWHIPResourceFromType(type, <string>request.body, opts.instance.getIceServers());
      opts.instance.addResource(resource);
      if (opts.instance.hasBroadcaster()) {
        resource.assignBroadcaster(opts.instance.getBroadcaster());
      }

      const sdpAnswer = await resource.sdpAnswer();
      reply.headers({
        "Content-Type": "application/sdp",
        "Location": opts.instance.getServerAddress() + opts.prefix + "/whip/" + type + "/" + resource.getId(),
      });
      addIceLinks(resource.getIceServers(), request, reply);
      reply.code(201).send(sdpAnswer);
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.options("/whip/:type", {}, async (request: any, reply: FastifyReply) => {
    try {
      addIceLinks(opts.instance.getIceServers(), request, reply);
      reply.code(204).send();            
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

  // Not part of WHIP
  fastify.get("/whip/:type/:resourceId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const resource = opts.instance.getResourceById(request.params.resourceId);
      reply.code(200).send(resource.asObject());
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });


  done();
}