import fastify, { FastifyInstance } from "fastify";
import https from "https";
import { WhipResource, WhipResourceIceServer } from "./whipResource";
import api from "./whipFastifyApi";
import { BroadcasterClientSfuPair } from "../broadcasterClient";

interface TLSOptions {
  key: string;
  cert: string;
}

interface WHIPEndpointOptions {
  port?: number;
  extPort?: number;
  interfaceIp?: string;
  hostname?: string;
  https?: boolean;
  tls?: TLSOptions;
  iceServers?: WhipResourceIceServer[];
  enabledWrtcPlugins?: string[];
}

export class WhipEndpoint {
  private server: FastifyInstance;
  private resources: {[id: string]: WhipResource};
  private broadcasterClientSfuPairs: BroadcasterClientSfuPair[] = [];
  private originSfuUrl?: string = undefined;
  private sfuApiKey?: string = undefined;
  private port: number;
  private extPort: number;
  private interfaceIp: string;
  private hostname: string;
  private useHttps: boolean;
  private iceServers?: WhipResourceIceServer[];
  private enabledWrtcPlugins: string[];
  private tls?: TLSOptions;

  constructor(opts?: WHIPEndpointOptions) {
    this.port = opts?.port || 8000;
    this.extPort = opts?.extPort || this.port;
    this.interfaceIp = opts?.interfaceIp || "0.0.0.0";
    this.useHttps = !!(opts?.https);
    this.hostname = opts?.hostname || "localhost";
    this.enabledWrtcPlugins = opts?.enabledWrtcPlugins || [];
    this.iceServers = opts?.iceServers || [];
    this.tls = opts?.tls;

    let httpsServer;
    if (this.useHttps && this.tls) {
      httpsServer = https.createServer({ key: this.tls.key, cert: this.tls.cert });
    }    
    this.server = fastify({ 
      ignoreTrailingSlash: true, 
      logger: { level: "info" },
      https: httpsServer,
    });
    this.server.register(require("fastify-cors"), {
      exposedHeaders: ["Location", "ETag", "Link"],
      methods: ["POST", "GET", "OPTIONS", "DELETE", "PATCH"],
      preflightContinue: true,
      strictPreflight: false,
    });
    this.server.register(api, { prefix: "/api/v2", instance: this });
    this.server.get("/", async () => {
      return "OK\n";
    });
    this.resources = {};
  }

  registerBroadcasterClient(broadcasterClientSfuPair: BroadcasterClientSfuPair) {
    this.broadcasterClientSfuPairs.push(broadcasterClientSfuPair);
  }

  setOriginSfuUrl(url: string) {
    this.originSfuUrl = url;
  }

  setSfuApiKey(apiKey: string) {
    this.sfuApiKey = apiKey;
  }

  hasBroadcasterClient(): boolean {
    return this.broadcasterClientSfuPairs.length !== 0;
  }

  getBroadcasterClientSfuPairs(): BroadcasterClientSfuPair[] {
    return this.broadcasterClientSfuPairs;
  }

  getOriginSfuUrl(): string {
    return this.originSfuUrl;
  }

  getSfuApiKey(): string {
    return this.sfuApiKey;
  }

  addResource(resource: WhipResource) {
    this.resources[resource.getId()] = resource;
  }

  deleteResource(id: string) {
    const resource = this.resources[id]; 
    if (resource) {
      delete this.resources[id];
      resource.destroy();
    }
  }

  async patchResource(id: string, body: string, eTag:string | undefined): Promise<number> {
    const resource = this.resources[id]; 
    if (resource) {
      return resource.patch(body, eTag);
    }
    return 404;
  }

  listResources() {
    return Object.keys(this.resources).map(id => {
      const resource = this.resources[id];
      return { id: resource.getId(), type: resource.getType() };
    });
  }

  getEnabledPlugins() {
    return this.enabledWrtcPlugins;
  }

  getResourceById(resourceId: string) {
    return this.resources[resourceId];
  }

  getIceServers(): WhipResourceIceServer[]|null {
    return this.iceServers;
  }

  getServerAddress(): string {
    return (this.useHttps ? "https" : "http") + "://" + this.hostname + ":" + this.extPort;
  }

  listen() {
    this.server.listen(this.port, this.interfaceIp, (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}`);
    });
  }
}
