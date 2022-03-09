import fastify, { FastifyInstance } from "fastify";

import api from "./api";

export class WHIPEndpoint {
  private server: FastifyInstance;

  constructor() {
    this.server = fastify({ ignoreTrailingSlash: true });
    this.server.register(require("fastify-cors"), {});
    this.server.register(api, { prefix: "/api/v1" });
    this.server.get("/", async () => {
      return "OK\n";
    });
 }

  listen(port) {
    this.server.listen(port, "0.0.0.0", (err, address) => {
      if (err) throw err;
      console.log(`WHIP endpoint listening at ${address}`);
    });
  }
}