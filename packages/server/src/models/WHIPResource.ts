import { Broadcaster } from "../broadcaster";

export const IANA_PREFIX = "urn:ietf:params:whip:";

export interface WHIPResourceICEServer {
    urls: string;
    username?: string;
    credential?: string;
}

export interface WHIPResource {
    getProtocolExtensions(): string[];
    sdpAnswer();
    assignBroadcaster(broadcaster: Broadcaster);
    getIceServers(): WHIPResourceICEServer[];
    getId(): string;
    getType(): string;
    patch(body: string): Promise<number>;
    destroy();
}
