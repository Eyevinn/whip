import { WHIPEndpoint, Broadcaster } from "./index";

const broadcaster = new Broadcaster({ 
  port: parseInt(process.env.BROADCAST_PORT || "8001"),
  baseUrl: process.env.BROADCAST_BASEURL,
  prefix: process.env.BROADCAST_PREFIX, 
});
broadcaster.listen();

const endpoint = new WHIPEndpoint({ port: parseInt(process.env.PORT || "8000") });
endpoint.registerBroadcaster(broadcaster);
endpoint.listen();

