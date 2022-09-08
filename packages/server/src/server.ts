import { WhipEndpoint, BroadcasterClient, BroadcasterClientSfuPair } from ".";
import { readFileSync } from "fs";

const sfuConfigFile = process.env.SFU_CONFIG_FILE ? process.env.SFU_CONFIG_FILE : '../../sfu-config.json';

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

const endpoint = new WhipEndpoint({ 
  port: parseInt(process.env.PORT || "8000"), 
  extPort: parseInt(process.env.EXT_PORT || "8000"),
  hostname: process.env.WHIP_ENDPOINT_HOSTNAME,
  https: process.env.WHIP_ENDPOINT_USE_HTTPS && process.env.WHIP_ENDPOINT_USE_HTTPS === "true",
  tls: tlsOptions,
  iceServers: iceServers,
  enabledWrtcPlugins: [ "rtsp", "rtmp", "sfu-broadcaster" ], 
});

interface SfuConfigData {
  origin: string;
  edges: {sfu: string; egress: string; id?: string;}[];
};

let sfuConfigFileContents = readFileSync(sfuConfigFile);
let sfuConfigData = <SfuConfigData>JSON.parse(sfuConfigFileContents.toString());

console.log(`Using SFU config data: ${JSON.stringify(sfuConfigData)}`);

sfuConfigData.edges.forEach(element => {
  endpoint.registerBroadcasterClient({
    client: new BroadcasterClient(element.egress, element.id), 
    sfuUrl: element.sfu
  });
});


endpoint.listen();
