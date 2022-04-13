import fastify, { FastifyInstance } from "fastify";
import https from "https";
import { WHIPResource, WHIPResourceICEServer } from "./models/WHIPResource";
import api from "./api";
import { Broadcaster } from "./broadcaster";

export { Broadcaster };

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
  iceServers?: WHIPResourceICEServer[];
  enabledWrtcPlugins?: string[];
}

export class WHIPEndpoint {
  private server: FastifyInstance;
  private resources: {[id: string]: WHIPResource};
  private broadcaster: Broadcaster;
  private port: number;
  private extPort: number;
  private interfaceIp: string;
  private hostname: string;
  private useHttps: boolean;
  private iceServers?: WHIPResourceICEServer[];
  private enabledWrtcPlugins: string[];
  private tls?: TLSOptions;

  constructor(opts?: WHIPEndpointOptions) {
    this.port = opts?.port || 8000;
    this.extPort = opts?.extPort || this.port;
    this.interfaceIp = opts?.interfaceIp || "0.0.0.0";
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
      exposedHeaders: ["Location", "Link"],
      methods: ["POST", "GET", "OPTIONS", "DELETE"],
      preflightContinue: true,
      strictPreflight: false,
    });
    this.server.register(api, { prefix: "/api/v1", instance: this });
    this.server.get("/", async () => {
      return "OK\n";
    });
    this.resources = {};
  }

  registerBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  hasBroadcaster(): boolean {
    return this.broadcaster !== null;
  }

  getBroadcaster(): Broadcaster {
    return this.broadcaster;
  }

  addResource(resource: WHIPResource) {
    this.resources[resource.getId()] = resource;
  }

  deleteResource(id: string) {
    const resource = this.resources[id]; 
    if (resource) {
      delete this.resources[id];
      resource.destroy();
    }
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

  getIceServers(): WHIPResourceICEServer[]|null {
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