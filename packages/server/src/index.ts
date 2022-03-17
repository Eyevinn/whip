import fastify, { FastifyInstance } from "fastify";
import { WHIPResource } from "./models/WHIPResource";
import api from "./api";
import { Broadcaster } from "./broadcaster";

export class WHIPEndpoint {
  private server: FastifyInstance;
  private resources: {[id: string]: WHIPResource};

  constructor(broadcaster?: Broadcaster) {
    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"), {
      exposedHeaders: ["Location"]
    });
    this.server.register(api, { prefix: "/api/v1", instance: this, broadcaster: broadcaster });
    this.server.get("/", async () => {
      return "OK\n";
    });
    this.server.get("/api/v1/sessions", async () => {
      return JSON.stringify(this.listResources(), null, 2);
    });
    this.resources = {};
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

  listen(port) {
    this.server.listen(port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}`);
    });
  }
}