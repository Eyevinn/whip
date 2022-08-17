import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { WrtcWhppViewer } from "./wrtc/wrtcWhppViewer";
import { WhppAnswerRequest, WhppCandidateRequest } from './whppRequests'
import { SfuWhppViewer } from "./sfu/sfuWhppViewer";

type BroadcasterRequest = FastifyRequest<{
  Params: {
    channelId: string
  }
}>

type BroadcasterPutRequest = FastifyRequest<{
  Params: {
    channelId: string,
    viewerId: string
  },
  Body: WhppAnswerRequest;
}>

type BroadcasterPatchRequest = FastifyRequest<{
  Params: {
    channelId: string,
    viewerId: string
  },
  Body: WhppAnswerRequest;
}>

type BroadcasterPostRequest = FastifyRequest<{
  Params: {
    channelId: string
  },
  Body: {};
}>

export default function (fastify: FastifyInstance, opts, done) {
  const broadcaster = opts.broadcaster;
  const useSFU: boolean | undefined = opts?.useSFU;

  fastify.addContentTypeParser('application/whpp+json', { parseAs: "string" }, (req, body: string, done) => {
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  })

  fastify.options("/channel/:channelId", {}, async (request: BroadcasterPostRequest, reply: FastifyReply) => {
    try {
      reply.headers({
        "Accept": [ "application/json", "application/whpp+json" ],
      });
      reply.code(204).send();
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown");
      reply.code(500).send(err.message);
    }
  });

  fastify.post("/channel/:channelId", {}, async (request: BroadcasterPostRequest, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const iceServers = broadcaster.getIceServers();

      const viewer = useSFU ? 
        new SfuWhppViewer(channelId, broadcaster.getSFUResourceIdForChannel(channelId), broadcaster.getMediaStreamsForChannel(channelId)) : 
        new WrtcWhppViewer(channelId, { iceServers: iceServers });

      viewer.on("connect", () => {
        broadcaster.addViewer(channelId, viewer);
      });
      viewer.on("disconnect", () => {
        broadcaster.removeViewer(channelId, viewer);
      });

      const stream = useSFU ? undefined : broadcaster.getStreamForChannel(channelId);
      const responseBody = await viewer.handlePost(stream);
      
      reply.code(201)
        .headers({
          'Content-type': 'application/whpp+json',
          'Location': broadcaster.getBaseUrl() + "/channel/" + channelId + '/' + viewer.getId()
        })
        .send(responseBody);

    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when handling a new WHPP client connection");
      reply.code(500).send(err.message);
    }
  });

  fastify.put("/channel/:channelId/:viewerId", {}, async (request: BroadcasterPutRequest, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const viewerId = request.params.viewerId;

      console.log(`channelId ${channelId}, viewerId ${viewerId}`);

      const viewer = broadcaster.getViewer(channelId, viewerId);
      if (!viewer) {
        console.error(`channelId ${channelId}, viewerId ${viewerId} not found`);
        reply.code(404).send();
        return;
      }

      await viewer.handlePut(request.body);
      reply.code(204).send();

    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when handling answer from WHPP client");
      reply.code(500).send(err.message);
    }
  });

  fastify.patch("/channel/:channelId/:viewerId", {}, async (request: BroadcasterPatchRequest, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const viewerId = request.params.viewerId;

      console.log(`channelId ${channelId}, viewerId ${viewerId}`);

      const viewer = broadcaster.getViewer(channelId, viewerId);
      if (!viewer) {
        console.error(`channelId ${channelId}, viewerId ${viewerId} not found`);
        reply.code(404).send();
        return;
      }

      try {
        await viewer.handlePatch(request.body);
        reply.code(204).send();
      } catch (exc) {
        console.error(exc.message);
        reply.code(405).send();
      }
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when handling ICE candidate");
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/mpd/:channelId", {}, async (request: BroadcasterRequest, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      const mpdXml = broadcaster.generateMpd(channelId);
      if (!mpdXml) {
        reply.code(404).send(`No channel with ID ${channelId} found`);
      } else {
        reply.code(200).headers({
          "Content-Type": "application/dash+xml",
        }).send(mpdXml);
      }
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when generating MPEG-DASH XML");
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/channel", {}, async (request: BroadcasterRequest, reply: FastifyReply) => {
    try {
      const channels = broadcaster.getChannels();
      reply.code(200).send(channels.map(channelId => {
        return { 
          channelId: channelId, 
          resource: broadcaster.getBaseUrl() + "/channel/" + channelId,
        };
      }));
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when trying to list channels");
      reply.code(500).send(err.message);
    }
  });

  fastify.get("/channel/:channelId", {}, async (request: BroadcasterRequest, reply: FastifyReply) => {
    try {
      const channelId = request.params.channelId;
      reply.headers({ "Content-Type": "application/whpp+json" });
      reply.code(200).send({
        channelId: channelId,
        viewers: broadcaster.getViewerCount(channelId),
      });
    } catch (e) {
      console.error(e);
      const err = new Error("Exception thrown when handling a viewer count request");
      reply.code(500).send(err.message);
    }
  });

  done();
}
