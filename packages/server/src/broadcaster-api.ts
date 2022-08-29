import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface ChannelPayload {
  sfuResourceId: string;
}

type BroadcasterIntRequest = FastifyRequest<{
  Params: {
    channelId: string
  }
}>

type BroadcasterIntPostRequest = FastifyRequest<{
  Params: {
    channelId: string
  },
  Body: ChannelPayload;
}>
  
export default function (fastify: FastifyInstance, opts, done) {
  const broadcaster = opts.broadcaster;

  fastify.post("/channel/:channelId", {}, async (request: BroadcasterIntPostRequest, reply: FastifyReply) => {
    try {
      broadcaster.createChannel(request.params.channelId, undefined, request.body.sfuResourceId);
      reply.code(201).send();
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when creating a channel");
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/channel/:channelId", {}, async (request: BroadcasterIntRequest, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const channelResponse: ChannelPayload = {
        sfuResourceId: broadcaster.getSFUResourceIdForChannel(channelId)
      };
      reply.code(200).send(channelResponse);
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when creating a channel");
      reply.code(500).send(err.message);
    }
  });

  done();
}  