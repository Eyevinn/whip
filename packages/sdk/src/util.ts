import { WHIPClientIceServer } from ".";

export function parseWHIPIceLinkHeader(value: string): WHIPClientIceServer|null {
  let iceServerConfig: WHIPClientIceServer;

  if (value.match(/rel="ice-server"/)) {
    if (value.match(/^stun:/)) {
      const stunMatch = value.match(/^(stun:\S+);/);
      if (!stunMatch) return null;
      const urls = stunMatch[1];
      if (urls) {
        iceServerConfig = { urls: urls };
      }
    } else if (value.match(/^turn:/)) {
      value.split(";").forEach((attr) => {
        if (attr.match(/^turn:/)) {
          const turnMatch = attr.match(/^(turn:\S+)/);
          if (!turnMatch) return;
          iceServerConfig = { urls: turnMatch[1] };
        } else if (attr.match(/^\s*username[=:]/)) {
          const usernameMatch = attr.match(/^\s*username[=:]\s*"*([^"]+)/);
          if (!usernameMatch) return;
          iceServerConfig.username = usernameMatch[1];
        } else if (attr.match(/^\s*credential[=:]/)) {
          const credentialMatch = attr.match(/^\s*credential[=:]\s*"*([^"]+)/);
          if (!credentialMatch) return;
          iceServerConfig.credential = credentialMatch[1];
        }
      });
    }
  }
  return iceServerConfig;
}