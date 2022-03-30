import fastify, { FastifyInstance } from "fastify";
import { MediaStream } from "wrtc";

import api from "./api";

interface BroadcasterICEServer {
  urls: string;
  username: string;
  credentials: string;
}

interface BroadcasterOptions {
  baseUrl?: string;
  port?: number;
  prefix?: string;
  iceServers?: BroadcasterICEServer[];
}

export class Broadcaster {
  private server: FastifyInstance;
  private channels: Map<string, MediaStream>;
  private port: number;
  private baseUrl: string;
  private prefix: string;
  private iceServers?: BroadcasterICEServer[];

  constructor(opts?: BroadcasterOptions) {
    this.port = 8001;
    this.prefix = "/broadcaster";
    this.baseUrl = `http://localhost:${this.port}${this.prefix}`;

    if (opts) {
      if (opts.baseUrl) {
        this.baseUrl = opts.baseUrl;
      }
      if (opts.prefix) {
        this.prefix = opts.prefix;
      }
      if (opts.port) {
        this.port = opts.port;
      }
      if (opts.iceServers) {
        this.iceServers = opts.iceServers;
      }
    }

    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"));
    this.server.register(api, { prefix: this.prefix, instance: this });

    this.channels = new Map();
  }

  createChannel(channelId: string, stream: MediaStream) {
    this.channels.set(channelId, stream);
  }

  getStreamForChannel(channelId: string) {
    return this.channels.get(channelId);
  }

  getChannels() {
    const channelIds = [];
    for (const k of this.channels.keys()) {
      channelIds.push(k);
    }
    return channelIds;
  }

  removeChannel(channelId: string) {
    this.channels.delete(channelId);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  getIceServers(): BroadcasterICEServer[]|null {
    return this.iceServers;
  }

  listen() {
    this.server.listen(this.port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`Broadcaster listening at ${address}`);
    });
  }
}