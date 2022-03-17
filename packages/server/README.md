# WHIP Endpoint

An NPM library containing a WebRTC ingest server that implements the WebRTC HTTP Ingestion Protocol (WHIP). 

The library includes the following WHIP destinations:
- A dummy receiver
- A WebRTC broadcaster (SFU)

## Setup

```
npm install --save @eyevinn/whip-endpoint
```

## Usage

Start a WHIP endpoint on port 8000 and register a WebRTC broadcaster (SFU)

```javascript
import { WHIPEndpoint, Broadcaster } from "@eyevinn/whip-endpoint";

const broadcaster = new Broadcaster({ 
  port: 8001,
  baseUrl: "http://<broadcasthost>:8001/broadcaster",
  prefix: "/broadcaster", 
});
broadcaster.listen();

const endpoint = new WHIPEndpoint({ port: 8000 });
endpoint.registerBroadcaster(broadcaster);
endpoint.listen();
```

The WHIP endpoint for the broadcaster is then available on `http://<host>:8000/api/v1/whip/broadcaster` and you will point your WHIP compatible producer to this endpoint.

Included is also a dummy endpoint if you just want to test the connectivity. Use `http://<host>:8000/api/v1/whip/dummy` in that case.

## Broadcaster

To access a channel you follow this (non standard) procedure:

1. Obtain the channel locator by issuing an HTTP GET on the WHIP resource URL, e.g. `curl http://<host>:8000/api/v1/whip/broadcaster/<uuid4>` which will return a JSON `{ channel }` where `channel` is the channel locator. For example `http://<broadcasthost>:8001/broadcaster/channel/<uuid4>`.
2. Create an RTC peer and an offer that can receive video and audio.
3. Send the SDP to the broadcaster using the channel locator obtained in 1: `curl -d '{ sdp: <localSdp> }' http://<broadcasthost>:8001/broadcaster/channel/<uuid4>`.
4. Connect the RTC peer's stream to your HTML video element.

Example code given that `channelUrl` has already been obtained:

```javascript
  const peer = new RTCPeerConnection();
  peer.onicecandidate = async (event) => {
    if (event.candidate === null) {
      // We have all ICE candidates
      const response = await fetch(channelUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sdp: peer.localDescription.sdp })
      });
      const { sdp } = await response.json();
      peer.setRemoteDescription({ type: "answer", sdp: sdp });
    }
  }
  peer.ontrack = (ev) => {
    if (ev.streams && ev.streams[0]) {
      document.querySelector("video").srcObject = ev.streams[0];
    }
  }

  const offer = await peer.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  });
  peer.setLocalDescription(offer);
```

## About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!