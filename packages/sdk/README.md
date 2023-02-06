# WHIP Web Client

A browser library / SDK for WebRTC ingest from mobile or browser using the WebRTC HTTP Ingestion Protocol (WHIP).

## Getting started

Example codes:

### NPM

```javascript
import { WHIPClient } from "@eyevinn/whip-web-client"

const client = new WHIPClient({
  endpoint: "http://<host>/whip/broadcaster",
  opts: { debug: true, iceServers: [{ urls: "stun:stun.l.google.com:19320" }] }
});
await client.setIceServersFromEndpoint();

const videoIngest = document.querySelector<HTMLVideoElement>("video#ingest");
const mediaStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});
videoIngest.srcObject = mediaStream;
await client.ingest(mediaStream);
```

Available options are:

```
{
  endpoint: string, // URL to WHIP endpoint
  opts: {
    debug: boolean, // enable debug console logging
    iceServers: [ { urls: string, username?: string, credential?: string }], // list of STUN/TURN servers
    authkey: string, // authentication key for auth option requests
    noTrickleIce: boolean, // force to not use trickle ICE
    timeout: number, // configure a ice gathering timeout when not using trickle ICE
  }
}
```

### CDN

Download the latest release and include the javascript files in your HTML.

```html
<html>
  <head><title>Webcam ingest</title></head>
  <body>
    <video autoplay muted>
    <script src="whip-client.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function(event) {
        const client = new WHIPClient({
          endpoint: "http://<host>/whip/broadcaster",
        });
        const videoIngest = document.querySelector("video#ingest");
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(function(mediaStream) {
            videoIngest.srcObject = mediaStream;
            return client.ingest(mediaStream);
          })
          .then(function() {
            console.log("Ingesting");
          })
          .catch(function(err) {
            console.error(err);
          });
      });
    </script>
  </body>
</html>
```

Build SDK documentation:

```
  npm run build:docs
```

## About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
