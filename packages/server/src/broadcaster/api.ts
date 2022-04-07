import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Viewer } from "./viewer";

export default function(fastify: FastifyInstance, opts, done) {

  fastify.post("/channel/:channelId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const iceServers = opts.broadcaster.getIceServers();

      const viewer = new Viewer(channelId, { iceServers: iceServers });
      viewer.on("connect", () => { opts.broadcaster.incrementViewer(channelId); });
      viewer.on("disconnect", () => { opts.broadcaster.decreaseViewer(channelId); });
      
      const remoteSdp = request.body.sdp;
      const stream = opts.broadcaster.getStreamForChannel(channelId);
      const answer = await viewer.handleOffer(remoteSdp, stream);
      reply.code(200).send({ type: "answer", sdp: answer });
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/channel", {}, async (request: any, reply: FastifyReply) => {
    try {
      const channels = opts.broadcaster.getChannels();
      reply.code(200).send(channels.map(channelId => {
        return { channelId: channelId, resource: opts.broadcaster.getBaseUrl() + "/channel/" + channelId };
      }));
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/channel/:channelId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      reply.code(200).send({
        channelId: channelId,
        viewers: opts.broadcaster.getViewers(channelId),
      });
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  done();
}