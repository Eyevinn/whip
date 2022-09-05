import { BroadcasterClientSfuPair } from "../broadcasterClient";
import { MediaStreamsInfo } from "../mediaStreamsInfo";

export const IANA_PREFIX = "urn:ietf:params:whip:";

export interface WhipResourceIceServer {
    urls: string;
    username?: string;
    credential?: string;
}

export interface WhipResource {
    connect();
    sdpAnswer(): Promise<string>;
    assignBroadcasterClients(broadcasterClientSfuPairs: BroadcasterClientSfuPair[]);
    getIceServers(): WhipResourceIceServer[];
    getId(): string;
    getETag(): string | undefined;
    getType(): string;
    patch(body: string, eTag?: string): Promise<number>;
    getMediaStreams(): MediaStreamsInfo;
    destroy(): void;
}
