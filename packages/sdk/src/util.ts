import { WHIPClientIceServer } from ".";

export function parseWHIPIceLinkHeader(value: string): WHIPClientIceServer|null {
  let iceServerConfig: WHIPClientIceServer;

  if (value.match(/rel="ice-server"/)) {
    if (value.match(/^stun:/)) {
      const [ _, urls ] = value.match(/^(stun:\S+);/);
      if (urls) {
        iceServerConfig = { urls: urls };
      }
    } else if (value.match(/^turn:/)) {
      value.split(";").forEach((attr) => {
        if (attr.match(/^turn:/)) {
          const [ _, urls ] = attr.match(/^(turn:\S+)/);
          iceServerConfig = { urls: urls };
        } else if (attr.match(/^\s*username[=:]/)) {
          const [ _, username ] = attr.match(/^\s*username[=:]\s*"*([^"]+)/);
          iceServerConfig.username = username;
        } else if (attr.match(/^\s*credential[=:]/)) {
          const [ _, credential ] = attr.match(/^\s*credential[=:]\s*"*([^"]+)/);
          iceServerConfig.credential = credential;
        }
      });
    }
  }
  return iceServerConfig;
}