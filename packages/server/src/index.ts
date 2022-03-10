import fastify, { FastifyInstance } from "fastify";
import { WHIPResource } from "./models/WHIPResource";
import api from "./api";

export class WHIPEndpoint {
  private server: FastifyInstance;
  private resources: {[id: string]: WHIPResource};

  constructor() {
    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"), {});
    this.server.register(api, { prefix: "/api/v1", instance: this });
    this.server.get("/", async () => {
      return "OK\n";
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

  listen(port) {
    this.server.listen(port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}`);
    });
  }
}