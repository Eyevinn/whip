import { Broadcaster } from "../broadcaster";
import { BroadcasterClient } from "../broadcasterClient";
import { MediaStreamsInfo } from "../mediaStreamsInfo";

export const IANA_PREFIX = "urn:ietf:params:whip:";

export interface WhipResourceIceServer {
    urls: string;
    username?: string;
    credential?: string;
}

export interface WhipResource {
    connect();
    getProtocolExtensions(): string[];
    sdpAnswer(): Promise<string>;
    assignBroadcaster(broadcaster: Broadcaster);
    assignBroadcasterClient(broadcaster: BroadcasterClient);
    getIceServers(): WhipResourceIceServer[];
    getId(): string;
    getETag(): string | undefined;
    getType(): string;
    patch(body: string, eTag?: string): Promise<number>;
    getMediaStreams(): MediaStreamsInfo;
    destroy(): void;
}
