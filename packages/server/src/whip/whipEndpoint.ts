import fastify, { FastifyInstance } from "fastify";
import https from "https";
import { WhipResource, WhipResourceIceServer } from "./whipResource";
import api from "./whipFastifyApi";
import { BroadcasterClientSfuPair } from "../broadcasterClient";
import { callResourceManager, OriginsAndEdges, OriginsAndEdgesPerTerritory } from "./resourceManagerClient";
import { readFileSync } from "fs";

export type SfuConfigData = Record<string, {sfu: string, egress: string}[]>

interface TLSOptions {
  key: string;
  cert: string;
}

interface ResourceManagersOptions {
  uri: string;
  territoryCode: string;
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
  resourceManager?: ResourceManagersOptions;
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
  private resourceManager?: ResourceManagersOptions;
  private jsonFilePath = process.env.SFU_CONFIG_FILE ? process.env.SFU_CONFIG_FILE : '../../sfu-config.json';

  constructor(opts?: WHIPEndpointOptions) {
    this.port = opts?.port || 8000;
    this.extPort = opts?.extPort || this.port;
    this.interfaceIp = opts?.interfaceIp || "0.0.0.0";
    this.useHttps = !!(opts?.https);
    this.hostname = opts?.hostname;
    this.enabledWrtcPlugins = opts?.enabledWrtcPlugins || [];
    this.iceServers = opts?.iceServers || [];
    this.tls = opts?.tls;
    this.resourceManager = opts?.resourceManager;

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
      exposedHeaders: ["Location", "ETag", "Link", "Access-Control-Allow-Methods"],
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

  async deleteResource(id: string) {
    const resource = this.resources[id]; 
    if (resource) {
      delete this.resources[id];
      await resource.destroy();
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

  getServerAddress(): string | undefined {
    if (this.hostname) {
      return (this.useHttps ? "https" : "http") + "://" + this.hostname + ":" + this.extPort;
    }
    return undefined;
  }

  async readEdgeListFromFile(): Promise<OriginsAndEdges> {
    const sfuConfigFileContents = readFileSync(this.jsonFilePath);
    return <OriginsAndEdges>JSON.parse(sfuConfigFileContents.toString());
  }

  async readEdgeListFromService(): Promise<OriginsAndEdges> {
    const OriginsAndEdgesPerTerritory = (await callResourceManager(this.resourceManager.uri)) as OriginsAndEdgesPerTerritory;
    return OriginsAndEdgesPerTerritory[this.resourceManager.territoryCode];
  }

  listen() {
    this.server.listen(this.port, this.interfaceIp, (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}/api/v2/whip`);
    });
  }
}
