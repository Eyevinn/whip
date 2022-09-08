import fetch from 'node-fetch';
import { v4 as uuidv4 } from "uuid";

import { MediaStreamsInfo } from "./mediaStreamsInfo";

export interface BroadcasterClientSfuPair {
  client: BroadcasterClient;
  sfuUrl: string;
}

export class BroadcasterClient {
  private url: URL;
  private id: string;
  
  constructor(url: string, id?: string) {
    this.url = new URL(url);
    this.id = id || uuidv4(); 
  }

  getId(): string {
    return this.id;
  }

  async createChannel(channelId: string, sfuResourceId?: string, mediaStreams?: MediaStreamsInfo) {
    const requestBody = {
      resourceId: sfuResourceId,
      mediaStreams: mediaStreams
    };
    const response = await fetch(this.url.href + "/channel/" + channelId, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (response.ok) {
      console.log(`Created channel ${channelId} on egress endpoint`);
    } else {
      throw new Error(`Failed to create channel  ${channelId}`);
    }
  }

  async removeChannel(channelId: string) {
    const response = await fetch(this.url.href + "/channel/" + channelId, {
      method: "DELETE"
    });
    if (response.ok) {
      console.log(`Removed channel ${channelId} from egress endpoint`);
    }
  }
}
