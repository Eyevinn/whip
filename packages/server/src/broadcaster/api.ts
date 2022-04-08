import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Viewer } from "./viewer";

export default function(fastify: FastifyInstance, opts, done) {
  const broadcaster = opts.broadcaster;

  fastify.post("/channel/:channelId", {}, async (request: any, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const iceServers = broadcaster.getIceServers();

      const viewer = new Viewer(channelId, { iceServers: iceServers });
      viewer.on("connect", () => {
        broadcaster.addViewer(channelId, viewer);
      });
      viewer.on("disconnect", () => { 
        broadcaster.removeViewer(channelId, viewer);
      });
      viewer.on("event", (message) => {
        broadcaster.onEventFromViewer(channelId, viewer, message);
      });
      
      const remoteSdp = request.body.sdp;
      const stream = broadcaster.getStreamForChannel(channelId);
      const answer = await viewer.handleOffer(remoteSdp, stream);
      reply.code(200).send({ type: "answer", sdp: answer });
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/channel", {}, async (request: any, reply: FastifyReply) => {
    try {
      const channels = broadcaster.getChannels();
      reply.code(200).send(channels.map(channelId => {
        return { channelId: channelId, resource: broadcaster.getBaseUrl() + "/channel/" + channelId };
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
        viewers: broadcaster.getViewerCount(channelId),
      });
    } catch (err) {
      console.error(err);
      reply.code(500).send(err.message);
    }
  });

  done();
}