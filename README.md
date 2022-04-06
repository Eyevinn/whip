# WebRTC-HTTP ingestion protocol

Client and Server modules for WebRTC HTTP Ingestion Protocol (WHIP)

| Module | Description |
| ------ | ----------- |
| @eyevinn/whip-endpoint | Server endpoint for providing WHIP resources |
| @eyevinn/whip-web-client | Client Javascript SDK for browser based WHIP client (WebRTC producer) |
| @eyevinn/whip-web-client-demo | Demonstration of a browser based WHIP client |

## Getting started

Install all dependencies

```
npm install
```

Run development environment which will launch a demo / test page at http://localhost:1234 and a WHIP endpoint at http://localhost:8000/api/v1

```
npm run dev
```

### Develop against demo backend

```
NODE_ENV=production npm run dev
```

To fetch ICE config from remote

```
API_KEY=<secret> ICE_CONFIG_REMOTE=1 NODE_ENV=production npm run dev
```

## TURN server

To run a TURN server locally you can use the Docker container of [coturn](https://hub.docker.com/r/coturn/coturn).

```
docker run -d -p 3478:3478 -p 3478:3478/udp -p 5349:5349 -p 5349:5349/udp -p 49160-49200:49160-49200/udp \
       coturn/coturn -n --log-file=stdout \
                        --external-ip='$(detect-external-ip)' \
                        --min-port=49160 --max-port=49200
```

And to use the above STUN/TURN server when developing

```
ICE_SERVERS=turn:<username>:<credential>@localhost:3478 npm run dev
```

## License (Apache-2.0)

```
Copyright 2022 Eyevinn Technology AB

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
