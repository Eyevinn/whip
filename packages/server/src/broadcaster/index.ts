import fastify, { FastifyInstance } from "fastify";
import { MediaStream } from "wrtc";

import api from "./api";

export class Broadcaster {
  private server: FastifyInstance;
  private channels: Map<string, MediaStream>;
  private port: string;

  constructor() {
    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"));
    this.server.register(api, { prefix: "/broadcaster", instance: this });

    this.channels = new Map();
  }

  createChannel(channelId: string, stream: MediaStream) {
    this.channels.set(channelId, stream);
  }

  getStreamForChannel(channelId: string) {
    return this.channels.get(channelId);
  }

  getBaseUrl() {
    return process.env.BROADCAST_BASEURL || `http://localhost:${this.port}/broadcaster`;
  }

  listen(port) {
    this.port = port;
    this.server.listen(this.port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`Broadcaster listening at ${address}`);
    });
  }
}