import { WhipEndpoint, BroadcasterClient } from ".";
import { readFileSync } from "fs";
import { SfuConfigData } from "./whip/whipEndpoint";
import { callbackify } from "util";
import { OriginsAndEdges } from "./whip/resourceManagerClient";

const resourceManagerUrl = process.env.RESOURCE_MANAGER_URL ? process.env.RESOURCE_MANAGER_URL : null;
const territoryCode = process.env.WHIP_SERVER_TERRITORY ? process.env.WHIP_SERVER_TERRITORY : null;

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

let resourceManagerOpts;
if(resourceManagerUrl && territoryCode) {
  resourceManagerOpts = {
    uri: resourceManagerUrl,
    territoryCode: territoryCode
  }
}

const endpoint = new WhipEndpoint({ 
  port: parseInt(process.env.PORT || "8000"), 
  extPort: parseInt(process.env.EXT_PORT || "8000"),
  hostname: process.env.WHIP_ENDPOINT_HOSTNAME,
  https: process.env.WHIP_ENDPOINT_USE_HTTPS && process.env.WHIP_ENDPOINT_USE_HTTPS === "true",
  tls: tlsOptions,
  iceServers: iceServers,
  enabledWrtcPlugins: [ "rtsp", "rtmp", "sfu-broadcaster" ], 
  resourceManager: resourceManagerOpts,
});

let callbackFunction;
if(resourceManagerOpts) {
  callbackFunction = callbackify(() => endpoint.readEdgeListFromService());
} else {
  callbackFunction = callbackify(() => endpoint.readEdgeListFromFile());
}

callbackFunction((err, ret) => {
  if (err) throw err;
  const sfuConfigData = parseEdges(ret);
  startUp(sfuConfigData);
});

function parseEdges(data: OriginsAndEdges) {
  const parsedData: SfuConfigData = {}
  const origin = Object.keys(data)[0];
  const edges = data[origin];
  parsedData[origin] = edges.map(edge => {
    return {sfu: edge.sfuApiUrl, egress: edge.egressApiUrl};
  });
  return parsedData;
};

function startUp(sfuConfigData: SfuConfigData) {
  console.log(`Using SFU config data: ${JSON.stringify(sfuConfigData)}`);
  const origin = Object.keys(sfuConfigData)[0];
  endpoint.setOriginSfuUrl(origin);
  sfuConfigData[origin].forEach(element => {
    endpoint.registerBroadcasterClient({
      client: new BroadcasterClient(element.egress), 
      sfuUrl: element.sfu
    });
  });
  endpoint.setSfuApiKey(process.env.SFU_API_KEY || "dev");
  endpoint.listen();
};
