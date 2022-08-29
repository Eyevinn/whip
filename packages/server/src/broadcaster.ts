import fastify, { FastifyInstance } from "fastify";
import { MediaStream } from "wrtc";
import https from "https";

import api from "./whpp/whppFastifyApi";
import internalApi from "./broadcaster-api";
import { WhppViewer } from "./whpp/whppViewer"
import { Channel } from "./channel";
import { MediaStreamsInfo } from "./mediaStreamsInfo"

export interface BroadcasterIceServer {
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
  iceServers?: BroadcasterIceServer[];
  preRollMpd?: string;
  useSFU?: boolean;
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
  private iceServers?: BroadcasterIceServer[];
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
      exposedHeaders: ["Location", "Accept", "Allow"],
      methods: ["POST", "GET", "OPTIONS", "PATCH", "PUT"],
      preflightContinue: true,
      strictPreflight: false,
    });
    this.server.register(api, { prefix: this.prefix, broadcaster: this, useSFU: opts?.useSFU });
    this.server.register(internalApi, { prefix: "/internal", broadcaster: this });

    this.channels = new Map();
  }

  createChannel(channelId: string, stream?: MediaStream, sfuResourceId?: string, mediaStreams?: MediaStreamsInfo) {
    // Check if channel with channelId already exists
    if (this.channels.get(channelId)) {
      throw new Error(`Channel with Id ${channelId} already exists`);
    }
    const channel = new Channel(channelId, stream, sfuResourceId, mediaStreams);
    if (this.preRollMpd) {
      channel.assignPreRollMpd(this.preRollMpd);
    }
    this.channels.set(channelId, channel);
  }

  getStreamForChannel(channelId: string): MediaStream | undefined {
    const channel = this.channels.get(channelId);
    if (channel) {
      return channel.getStream();
    }
    return undefined;
  }

  getSFUResourceIdForChannel(channelId: string): string | undefined {
    const channel = this.channels.get(channelId);
    if (channel) {
      return channel.getSFUResourceId();
    }
    return undefined;
  }

  getMediaStreamsForChannel(channelId: string): MediaStreamsInfo | undefined {
    const channel = this.channels.get(channelId);
    if (channel) {
      return channel.getMediaStreams();
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

  addViewer(channelId: string, newViewer: WhppViewer) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.log(`channelId ${channelId} not found`);
      return;
    }
    channel.addViewer(newViewer);
  }

  removeViewer(channelId: string, viewerToRemove: WhppViewer) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }
    
    channel.removeViewer(viewerToRemove);
  }

  getViewer(channelId: string, viewerId: string): WhppViewer|undefined {
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

  getIceServers(): BroadcasterIceServer[]|null {
    return this.iceServers;
  }

  listen() {
    this.server.listen(this.port, this.interfaceIp, (err, address) => {
      if (err) throw err;
      console.log(`Broadcaster listening at ${address}`);
    });
  }
}
