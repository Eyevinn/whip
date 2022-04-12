import { MediaStream, RTCDataChannel } from "wrtc";
import { EventEmitter } from "events";

import { Viewer } from "./viewer";

interface BackChannelMessage {
  viewerId?: string;
  message: any;
}

interface BroadcastMessage {
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
    this.onViewersChange();
  }

  removeViewer(viewerToRemove: Viewer) {
    this.viewers = this.viewers.filter(v => v.getId() !== viewerToRemove.getId());
    this.onViewersChange();
  }

  onViewersChange() {
    this.sendMessageOnBackChannel({
      message: { event: "viewerschange", viewercount: this.viewers.length },
    });
    this.broadcastMessage("broadcaster", {
      message: { event: "viewerschange", viewercount: this.viewers.length },
    })
  }

  sendMessageOnBackChannel(message: BackChannelMessage) {
    if (!this.dataChannel) {
      this.log(`No backchannel found, not sending`);
      return;
    }    
    if (this.dataChannel.readyState !== "open") {
      this.log(`Backchannel not ready to receive, not sending`);
      return;
    }

    this.dataChannel.send(JSON.stringify(message));
  }

  broadcastMessage(channelLabel: string, message: BroadcastMessage) {
    this.viewers.forEach(viewer => {
      viewer.send(channelLabel, message);
    });
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
    if (this.dataChannel) {
      this.dataChannel.close();
    }
  }
}