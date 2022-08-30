import fetch from 'node-fetch';

import { LinkTypes } from "./broadcaster";
import { MediaStreamsInfo } from "./mediaStreamsInfo";

export interface BroadcasterClientOptions {
  url?: string;
  egressUrl?: string;
}

export class BroadcasterClient {
  private url: URL;
  private egressUrl: URL;

  constructor(opts: BroadcasterClientOptions) {
    this.url = new URL(opts.url || "http://localhost:8001/api");
    this.egressUrl = new URL(opts.egressUrl || "http://localhost:8001/whpp/channel");
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
  
  getBaseUrl(): string {
    return this.egressUrl.href;
  }

  getLinkTypes(prefix): LinkTypes {
    return {
      list: prefix + "whpp-list",
      channel: prefix + "whpp",
      mpd: "urn:mpeg:dash:schema:mpd:2011",
    }
  }
}