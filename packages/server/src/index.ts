import fastify, { FastifyInstance } from "fastify";
import { WHIPResource, WHIPResourceICEServer } from "./models/WHIPResource";
import api from "./api";
import { Broadcaster } from "./broadcaster";

export { Broadcaster };

interface WHIPEndpointOptions {
  port?: number;
  iceServers?: WHIPResourceICEServer[];
  serverAddress?: string;
}

export class WHIPEndpoint {
  private server: FastifyInstance;
  private resources: {[id: string]: WHIPResource};
  private broadcaster: Broadcaster;
  private port: number;
  private iceServers?: WHIPResourceICEServer[];
  private serverAddress: string;

  constructor(opts?: WHIPEndpointOptions) {
    this.port = 8000;
    this.serverAddress = "http://localhost" + ":" + this.port;
    if (opts) {
      if (opts.port) {
        this.port = opts.port;
      }
      if (opts.iceServers) {
        this.iceServers = opts.iceServers;
      }
      if (opts.serverAddress) {
        this.serverAddress = opts.serverAddress;
      }
    }

    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"), {
      exposedHeaders: ["Location", "Link"],
      methods: ["POST", "GET", "OPTIONS"],
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

  getResourceById(resourceId: string) {
    return this.resources[resourceId];
  }

  getIceServers(): WHIPResourceICEServer[]|null {
    return this.iceServers;
  }

  getServerAddress(): string {
    return this.serverAddress;
  }

  listen() {
    this.server.listen(this.port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}`);
    });
  }
}