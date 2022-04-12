import fastify, { FastifyInstance } from "fastify";
import { MediaStream, RTCDataChannel } from "wrtc";

import api from "./api";
import { Viewer } from "./viewer";
import { Channel } from "./channel";

export interface BroadcasterICEServer {
  urls: string;
  username?: string;
  credential?: string;
}

interface BroadcasterOptions {
  port?: number;
  extPort?: number;
  interfaceIp?: string;
  hostname?: string;
  https?: boolean;
  prefix?: string;
  iceServers?: BroadcasterICEServer[];
}

export class Broadcaster {
  private server: FastifyInstance;
  private channels: Map<string, Channel>;
  private port: number;
  private extPort: number;
  private interfaceIp: string;
  private hostname: string;
  private useHttps: boolean;
  private prefix: string;
  private iceServers?: BroadcasterICEServer[];

  constructor(opts?: BroadcasterOptions) {
    this.port = opts?.port || 8001;
    this.extPort = opts?.extPort || this.port;
    this.interfaceIp = opts?.interfaceIp || "0.0.0.0";
    this.useHttps = !!(opts?.https);
    this.hostname = opts?.hostname || "localhost";
    this.prefix = "/broadcaster";
    this.iceServers = opts?.iceServers || [];

    this.server = fastify({ ignoreTrailingSlash: true, logger: { level: "info" } });
    this.server.register(require("fastify-cors"));
    this.server.register(api, { prefix: this.prefix, broadcaster: this });

    this.channels = new Map();
  }

  createChannel(channelId: string, stream: MediaStream) {
    const channel = new Channel(channelId, stream);
    this.channels.set(channelId, channel);
  }

  assignBackChannel(channelId: string, dataChannel: RTCDataChannel) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }
    channel.assignBackChannel(dataChannel);
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
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.destroy();
    }
    this.channels.delete(channelId);
  }

  addViewer(channelId: string, newViewer: Viewer) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }
    channel.addViewer(newViewer);
  }

  removeViewer(channelId: string, viewerToRemove: Viewer) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }
    
    channel.removeViewer(viewerToRemove);
  }

  getViewerCount(channelId: string): number {
    const channel = this.channels.get(channelId);
    return channel.getViewers().length;
  }
 
  getBaseUrl(): string {
    return (this.useHttps ? "https" : "http") + "://" + this.hostname + ":" + this.extPort + this.prefix;
  }

  getIceServers(): BroadcasterICEServer[]|null {
    return this.iceServers;
  }

  onMessageFromViewer(channelId: string, viewer: Viewer, message: string) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }
    const json = JSON.parse(message);
    console.log(`Received message from viewer ${viewer.getId()}`, json);

    channel.sendMessageOnBackChannel({
      viewerId: viewer.getId(),
      message: json,
    });
  }

  listen() {
    this.server.listen(this.port, this.interfaceIp, (err, address) => {
      if (err) throw err;
      console.log(`Broadcaster listening at ${address}`);
    });
  }
}