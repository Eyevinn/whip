# WHIP Endpoint

An NPM library containing a WebRTC ingest server that implements the WebRTC HTTP Ingestion Protocol (WHIP). 

The library includes the following WHIP destinations:
- A dummy receiver
- An SFU broadcaster
- An RTSP restreaming output

## Setup

```
npm install --save @eyevinn/whip-endpoint
```

## Options

Available WHIP endpoint options are:

```javascript
{
  port: number, // port to bind to
  extPort: number, // port that is exposed in public (default same as port)
  interfaceIp: string, // ip to bind and listen on
  hostname: string, // hostname or public IP
  https: boolean, // use https
  tls: { key: string, cert: string }, // key and cert for TLS termination (optional),
  iceServers: [ { urls: string, username?: string, credential?: string }], // list of STUN/TURN servers
  enabledWrtcPlugins: string[], // list of plugins to enabled. Available are "sfu-broadcaster", "rtsp", "rtmp"
  resourceManager: {uri: string, territoryCode: string}, // Uri to Resource Manager & territory code, e.g "SE". Both must be set to use a resource manager. (optional)
}
```

The included plugins then provides the following endpoints:
- sfu-broadcaster: `http://<whiphost>:8000/api/v2/whip/sfu-broadcaster?channelId=<channelId>`
- rtsp: `http://<whiphost>:8000/api/v2/whip/rtsp`
- rtmp: `http://<whiphost>:8000/api/v2/whip/rtmp`

## Server Reference Implementation

Start a [refererence implementation](src/server.ts) built on this WHIP endpoint library. 

```
npm run build
npm run server
```

### Environment variables

The following environment variables are read to override default values:
- `ICE_GATHERING_TIMEOUT`: (default: 4000 ms): Timeout for gathering all ICE candidates
- `API_KEY`: Authorization key that clients must use to get ICE server config on OPTIONS request
- `SFU_CONFIG_FILE`: Used to configure the path to the local json file. Default value is `../../sfu-config.json`.
- `RESOURCE_MANAGER_URL`: URI to resource manager API. If not set, application will import sfu config data from local json.
- `WHIP_SERVER_TERRITORY`: The territory of the application, using two-lettered country codes. E.g `SE` or `DK`.

## Usage (WebRTC Broadcasting)

Start a WHIP endpoint on port 8000 and register a WebRTC SFU broadcaster client that
creates the channels on the egress endpoint. Example using [@eyevinn/wrtc-egress](https://github.com/Eyevinn/wrtc-egress) library as Egress endpoint and Symphony Media Bridge as origin and edge media server (SFU).

```javascript
import { WhipEndpoint } from "@eyevinn/whip-endpoint";

const endpoint = new WhipEndpoint({ 
  port: 8000, 
  hostname: "<whiphost>",
  https: false,
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  enabledWrtcPlugins: [ "sfu-broadcaster" ], 
});

endpoint.setOriginSfuUrl("http://<sfu-origin>/conferences/");
endpoint.registerBroadcasterClient({
  client: new BroadcasterClient("http://<wrtc-egress-endpoint>/api"), 
  sfuUrl: "http://<sfu-edge>/conferences/"
});
endpoint.setSfuApiKey(string | undefined);
endpoint.listen();
```

The WHIP endpoint for the sfu-broadcaster is then available on `http://<whiphost>:8000/api/v2/whip/sfu-broadcaster?channelId=<channelId>` and this is where you will point your WHIP compatible producer to this endpoint.
Then you can access the channel using the provided protocol that the Egress endpoint provides. 

For example using the [WebRTC HTTP Egress Protocol (WEPP)](https://datatracker.ietf.org/doc/draft-murillo-whep/) and the channel url `http://<wrtc-egress-endpoint>/whep/channel/<channelId>`. The [Eyevinn WebRTC Player](https://webrtc.player.eyevinn.technology) has built-in support for WHEP and can be used to try this out.

### TLS Termination example

If you want to use TLS termination you provide the `tls` object containing key and cert. The `https` option must be set to `true`.

```javascript
const endpoint = new WhipEndpoint({ 
  port: 443, 
  hostname: "whip.lab.eyevinn",
  https: true,
  tls: {
    key: fs.readFileSync("./server-key.pem"),
    cert: fs.readFileSync("./server-cert.pem"),
  },
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  enabledWrtcPlugins: [ "sfu-broadcaster" ], 
});

// ...
```

### Resource Manager example

If you want to use a Resource Manager; Provide a `uri` and a two lettered `territoryCode` to `resourceManager`.

```javascript
const endpoint = new WhipEndpoint({ 
  port: 8000
  hostname: "whip.lab.eyevinn",
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  enabledWrtcPlugins: [ "rtsp", "rtmp", "sfu-broadcaster" ], 
  resourceManager: {uri: "http://127.0.0.1:8080", territoryCode: "SE"}
});

// ...
```

## RTSP output

By default it will restream a WHIP stream to an RTSP server (TCP) running on localhost. If you want to change this you can override this setting by setting the environment variable `RTSP_SERVER` to for example `RTSP_SERVER=rtsp://lab.eyevinn:8554`. If you want to run an RTSP server locally you can use the provided docker-compose file `rtsp-server.yml`.

```
docker-compose -f rtsp-server.yml up -d
```

To play the RTSP stream you can for example use ffplay:

```
ffplay rtsp://lab.eyevinn:8554/<uuid4>
```

Default output resolution is 960x540 but this can be overriden by setting the environment variable `RTSP_RESOLUTION` to for example `RTSP_RESOLUTION=1920x1080`.

## About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
