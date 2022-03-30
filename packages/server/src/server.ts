import { WHIPEndpoint, Broadcaster } from "./index";

let iceServers = null;
if (process.env.ICE_SERVERS) {
  iceServers = [];
  process.env.ICE_SERVERS.split(",").forEach(server => {
    // stun:stun.l.google.com:19302@<username>:<credentials>
    const [ url, auth ] = server.split("@");
    let username = null;
    let credentials = null;
    if (auth) {
      [ username, credentials ] = auth.split(":");
    }
    iceServers.push({ urls: url, username: username, credentials: credentials });
  });
}
if (iceServers) {
  console.log("Using ICE servers:");
  iceServers.forEach(server => {
    console.log(server);
  });
}

const broadcaster = new Broadcaster({ 
  port: parseInt(process.env.BROADCAST_PORT || "8001"),
  baseUrl: process.env.BROADCAST_BASEURL,
  prefix: process.env.BROADCAST_PREFIX,
  iceServers: iceServers,
});
broadcaster.listen();

const endpoint = new WHIPEndpoint({ port: parseInt(process.env.PORT || "8000"), iceServers: iceServers });
endpoint.registerBroadcaster(broadcaster);
endpoint.listen();

