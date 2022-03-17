# WHIP Web Client

A browser library / SDK for WebRTC ingest from mobile or browser using the WebRTC HTTP Ingestion Protocol (WHIP).

## Getting started

Example codes:

### NPM

```javascript
import { WHIPClient } from "@eyevinn/whip-web-client"

const client = new WHIPClient({
  endpoint: "http://<host>/whip/broadcaster",
  element: document.querySelector("video"),
  opts: { debug: true }
});
await client.connect();
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
          element: document.querySelector("video"),
        });
        client.connect().then(function() {
          console.log("We are connected!");
        });
      });
    </script>
  </body>
</html>
```

## About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
