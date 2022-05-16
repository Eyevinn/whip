import fastify, { FastifyInstance } from "fastify";
import { MediaStream, RTCDataChannel } from "wrtc";
import https from "https";

import api from "./api";
import { Viewer } from "./viewer";
import { Channel } from "./channel";

export interface BroadcasterICEServer {
  urls: string;
  username?: string;
  credential?: string;
}

interface LinkTypes {
  list: string;
  channel: string;
  mpd: string;
}

interface TLSOptions {
  key: string;
  cert: string;
}

interface BroadcasterOptions {
  port?: number;
  extPort?: number;
  interfaceIp?: string;
  hostname?: string;
  https?: boolean;
  tls?: TLSOptions;
  prefix?: string;
  iceServers?: BroadcasterICEServer[];
  preRollMpd?: string;
}

export class Broadcaster {
  private server: FastifyInstance;
  private channels: Map<string, Channel>;
  private port: number;
  private extPort: number;
  private interfaceIp: string;
  private hostname: string;
  private useHttps: boolean;
  private tls?: TLSOptions;
  private prefix: string;
  private iceServers?: BroadcasterICEServer[];
  private preRollMpd?: string;

  constructor(opts?: BroadcasterOptions) {
    this.port = opts?.port || 8001;
    this.extPort = opts?.extPort || this.port;
    this.interfaceIp = opts?.interfaceIp || "0.0.0.0";
    this.useHttps = !!(opts?.https);
    this.hostname = opts?.hostname || "localhost";
    this.prefix = "/broadcaster";
    this.iceServers = opts?.iceServers || [];
    this.tls = opts?.tls;
    this.preRollMpd = opts?.preRollMpd;

    let httpsServer;
    if (this.useHttps && this.tls) {
      httpsServer = https.createServer({ key: this.tls.key, cert: this.tls.cert });
    }    

    this.server = fastify({ 
      ignoreTrailingSlash: true, 
      logger: 
      { level: "info" },
      https: httpsServer, 
    });
    this.server.register(require("fastify-cors"), {
      exposedHeaders: ["Location"],
      methods: ["POST", "GET", "OPTIONS", "PATCH", "PUT"],
      preflightContinue: true,
      strictPreflight: false,
    });
    this.server.register(api, { prefix: this.prefix, broadcaster: this });

    this.channels = new Map();
  }

  createChannel(channelId: string, stream: MediaStream) {
    // Check if channel with channelId already exists
    if (this.channels.get(channelId)) {
      throw new Error(`Channel with Id ${channelId} already exists`);
    }
    const channel = new Channel(channelId, stream);
    if (this.preRollMpd) {
      channel.assignPreRollMpd(this.preRollMpd);
    }
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

  getLinkTypes(prefix): LinkTypes {
    return {
      list: prefix + "whpp-list",
      channel: prefix + "whpp",
      mpd: "urn:mpeg:dash:schema:mpd:2011",
    }
  }

  generateMpd(channelId: string) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return null;
    }
    const rel = this.getLinkTypes("urn:ietf:params:whip:")["channel"];
    return channel.generateMpdXml(`${this.getBaseUrl()}/channel/${channelId}`, rel);
  }

  addViewer(channelId: string, newViewer: Viewer) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.log(`channelId ${channelId} not found`);
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

  getViewer(channelId: string, viewerId: string): Viewer|undefined {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return undefined;
    }

    return channel.getViewer(viewerId);
  }

  getViewerCount(channelId: string): number {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return 0;
    }
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
