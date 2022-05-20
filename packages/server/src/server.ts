import { WHIPEndpoint, Broadcaster } from "./index";

import { readFileSync } from "fs";

let iceServers = null;
if (process.env.ICE_SERVERS) {
  iceServers = [];
  process.env.ICE_SERVERS.split(",").forEach(server => {
    // turn:<username>:<password>@turn.eyevinn.technology:3478
    const m = server.match(/^turn:(\S+):(\S+)@(\S+):(\d+)/);
    if (m) {
      const [ _, username, credential, host, port ] = m;
      iceServers.push({ urls: "turn:" + host + ":" + port, username: username, credential: credential });
    }
  });
}
if (iceServers) {
  console.log("Using ICE servers:");
  iceServers.forEach(server => {
    console.log(server);
  });
} else {
  console.log("Using default ICE servers");
  iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
}

let tlsOptions;
if (process.env.TLS_TERMINATION_ENABLED) {
  tlsOptions = {
    key: readFileSync("../../server-key.pem"),
    cert: readFileSync("../../server-cert.pem")
  }
}

const broadcaster = new Broadcaster({ 
  port: parseInt(process.env.BROADCAST_PORT || "8001"),
  extPort: parseInt(process.env.BROADCAST_EXT_PORT || "8001"),
  hostname: process.env.BROADCAST_HOSTNAME,
  https: process.env.BROADCAST_USE_HTTPS && process.env.BROADCAST_USE_HTTPS === "true",
  tls: tlsOptions,
  prefix: process.env.BROADCAST_PREFIX,
  iceServers: iceServers,
  preRollMpd: process.env.PREROLL_MPD,
});
broadcaster.listen();

const endpoint = new WHIPEndpoint({ 
  port: parseInt(process.env.PORT || "8000"), 
  extPort: parseInt(process.env.EXT_PORT || "8000"),
  hostname: process.env.WHIP_ENDPOINT_HOSTNAME,
  https: process.env.WHIP_ENDPOINT_USE_HTTPS && process.env.WHIP_ENDPOINT_USE_HTTPS === "true",
  tls: tlsOptions,
  iceServers: iceServers,
  enabledWrtcPlugins: [ "broadcaster", "dummy", "rtsp", "sfu-broadcaster" ], 
});
endpoint.registerBroadcaster(broadcaster);
endpoint.listen();

