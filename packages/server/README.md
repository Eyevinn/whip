# WHIP Endpoint

An NPM library containing a WebRTC ingest server that implements the WebRTC HTTP Ingestion Protocol (WHIP). 

The library includes the following WHIP destinations:
- A dummy receiver
- A WebRTC broadcaster (SFU)
- An RTSP restreaming output

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
  hostname: "<broadcasthost>",
  interfaceIp: "0.0.0.0",
  https: false,
  prefix: "/broadcaster",
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
});
broadcaster.listen();

const endpoint = new WHIPEndpoint({ 
  port: 8000,
  hostname: "<whiphost>", 
  https: false,
  interfaceIp: "0.0.0.0",
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  enabledWrtcPlugins: [ "broadcaster" ] 
});
endpoint.registerBroadcaster(broadcaster);
endpoint.listen();
```

### TLS Termination example

If you want to use TLS termination you provide the `tls` object containing key and cert. The `https` option must be set to `true`.

```javascript
const endpoint = new WHIPEndpoint({ 
  port: 443, 
  hostname: "whip.lab.eyevinn",
  https: true,
  tls: {
    key: fs.readFileSync("./server-key.pem"),
    cert: fs.readFileSync("./server-cert.pem"),
  },
  iceServers: iceServers,
  enabledWrtcPlugins: [ "broadcaster" ], 
});
```

### Options

Available WHIP endpoint options are:

```
{
  port: number, // port to bind to
  extPort: number, // port that is exposed in public (default same as port)
  interfaceIp: string, // ip to bind and listen on
  hostname: string, // hostname or public IP
  https: boolean, // use https
  tls: { key: string, cert: string }, // key and cert for TLS termination (optional),
  iceServers: [ { urls: string, username?: string, credential?: string }], // list of STUN/TURN servers
  enabledWrtcPlugins: string[], // list of plugins to enabled. Available are "broadcaster", "rtsp"
}
```

The WHIP endpoint for the broadcaster is then available on `http://<host>:8000/api/v1/whip/broadcaster` and you will point your WHIP compatible producer to this endpoint.

And the WHIP endpoint for the RTSP output is available on `http://<host>:8000/api/v1/whip/rtsp`.

Included is also a dummy endpoint if you just want to test the connectivity. Use `http://<host>:8000/api/v1/whip/dummy` in that case.

### Environment variables

The following environment variables are read to override default values:
- `ICE_GATHERING_TIMEOUT` (default: 4000 ms): Timeout for gathering all ICE candidates
- `API_KEY`: Authorization key that clients must use to get ICE server config on OPTIONS request

## Broadcaster

To access a channel you follow this procedure:

1. Obtain the channel locator from the `Link` header of type `rel=urn:ietf:params:whip:whpp` in the `201` response when creating the WHIP resource.
2. Follow the [WebRTC HTTP Playback Protocol](https://github.com/Eyevinn/webrtc-http-playback-protocol) to establish an RTP connection for consumption only or use the [WebRTC player with support for WHPP](https://github.com/Eyevinn/webrtc-player).

## RTSP output

By default it will restream a WHIP stream to an RTSP server (TCP) running on localhost. If you want to change this you can override this setting by setting the environment variable `RTSP_SERVER` to for example `RTSP_SERVER=rtsp://lab.eyevinn:8554`. If you want to run an RTSP server locally you can use the provided docker-compose file `rtsp-server.yml`.

```
docker-compose -f rtsp-server.yml up -d
```

To play the RTSP stream you can for example use ffplay:

```
ffplay rtsp://lab.eyevinn:8554/<uuid4>
```

The complete RTSP URL with the ID can be identified by the `Link` header of rel `rel=urn:ietf:params:whip:eyevinn-wrtc-rtsp`.

Default output resolution is 960x540 but this can be overriden by setting the environment variable `RTSP_RESOLUTION` to for example `RTSP_RESOLUTION=1920x1080`.

## About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
