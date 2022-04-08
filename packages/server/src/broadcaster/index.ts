import fastify, { FastifyInstance } from "fastify";
import { MediaStream } from "wrtc";

import api from "./api";
import { Viewer } from "./viewer";
import { Channel } from "./channel";

export interface BroadcasterICEServer {
  urls: string;
  username?: string;
  credential?: string;
}

interface BroadcasterOptions {
  baseUrl?: string;
  port?: number;
  prefix?: string;
  iceServers?: BroadcasterICEServer[];
}

export class Broadcaster {
  private server: FastifyInstance;
  private channels: Map<string, Channel>;
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
    this.server.register(api, { prefix: this.prefix, broadcaster: this });

    this.channels = new Map();
  }

  createChannel(channelId: string, stream: MediaStream) {
    const channel = new Channel(channelId, stream);
    this.channels.set(channelId, channel);
  }

  getStreamForChannel(channelId: string): MediaStream {
    const channel = this.channels.get(channelId);
    if (channel) {
      return channel.getStream();
    }
    return undefined;
  }

  getChannels(): string[] {
    const channelIds = [];
    for (const k of this.channels.keys()) {
      channelIds.push(k);
    }
    return channelIds;
  }

  removeChannel(channelId: string) {
    this.channels.delete(channelId);
  }

  addViewer(channelId: string, newViewer: Viewer) {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.addViewer(newViewer);
    }
  }

  removeViewer(channelId: string, viewerToRemove: Viewer) {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.removeViewer(viewerToRemove);
    }
  }

  getViewerCount(channelId: string): number {
    const channel = this.channels.get(channelId);
    return channel.getViewers().length;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getIceServers(): BroadcasterICEServer[]|null {
    return this.iceServers;
  }

  onEventFromViewer(channelId: string, viewer: Viewer, message) {

  }

  listen() {
    this.server.listen(this.port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`Broadcaster listening at ${address}`);
    });
  }
}