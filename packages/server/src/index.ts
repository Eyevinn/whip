import fastify, { FastifyInstance } from "fastify";
import { WHIPResource, WHIPResourceICEServer } from "./models/WHIPResource";
import api from "./api";
import { Broadcaster } from "./broadcaster";

export { Broadcaster };

interface WHIPEndpointOptions {
  port?: number;
  iceServers?: WHIPResourceICEServer[]
}

export class WHIPEndpoint {
  private server: FastifyInstance;
  private resources: {[id: string]: WHIPResource};
  private broadcaster: Broadcaster;
  private port: number;
  private iceServers?: WHIPResourceICEServer[];

  constructor(opts?: WHIPEndpointOptions) {
    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"), {
      exposedHeaders: ["Location"]
    });
    this.server.register(api, { prefix: "/api/v1", instance: this });
    this.server.get("/", async () => {
      return "OK\n";
    });
    this.resources = {};

    this.port = 8000;
    if (opts) {
      if (opts.port) {
        this.port = opts.port;
      }
      if (opts.iceServers) {
        this.iceServers = opts.iceServers;
      }
    }
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

  listen() {
    this.server.listen(this.port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}`);
    });
  }
}