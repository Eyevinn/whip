import { MediaStream, RTCDataChannel } from "wrtc";
import { EventEmitter } from "events";

import { Viewer } from "./viewer";

interface BackChannelMessage {
  viewerId: string;
  message: any;
}

export class Channel extends EventEmitter {
  private channelId: string;
  private mediaStream: MediaStream;
  private dataChannel?: RTCDataChannel;
  private viewers: Viewer[];

  constructor(channelId: string, mediaStream: MediaStream) {
    super();
    this.channelId = channelId;
    this.mediaStream = mediaStream;
    this.viewers = [];
  }

  private log(...args: any[]) {
    console.log(`[${this.channelId}]`, ...args);
  }

  assignBackChannel(dataChannel: RTCDataChannel) {
    this.log("Assigning backchannel", dataChannel);
    this.dataChannel = dataChannel;
  }

  addViewer(newViewer: Viewer) {
    this.viewers.push(newViewer);
  }

  removeViewer(viewerToRemove: Viewer) {
    this.viewers = this.viewers.filter(v => v.getId() !== viewerToRemove.getId());
  }

  sendMessageOnBackChannel(message: BackChannelMessage) {
    this.log(this.dataChannel);
    if (!this.dataChannel) {
      return;
    }    
    if (this.dataChannel.readyState !== "open") {
      return;
    }

    this.dataChannel.send(JSON.stringify(message));
  }

  getViewers(): Viewer[] {
    return this.viewers;
  }

  getStream(): MediaStream {
    return this.mediaStream;
  }

  getId(): string {
    return this.channelId;
  }

  destroy() {
    this.dataChannel.close();
  }
}