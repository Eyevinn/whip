import { Broadcaster } from "../broadcaster";

export const IANA_PREFIX = "urn:ietf:params:whip:";

export interface WHIPResourceICEServer {
    urls: string;
    username?: string;
    credential?: string;
}

export interface WHIPResource {
    connect();
    getProtocolExtensions(): string[];
    sdpAnswer(): Promise<string>;
    assignBroadcaster(broadcaster: Broadcaster);
    getIceServers(): WHIPResourceICEServer[];
    getId(): string;
    getETag(): string | undefined;
    getType(): string;
    patch(body: string): Promise<number>;
    destroy();
}
