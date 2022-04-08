import { MediaStream } from "wrtc";
import { EventEmitter } from "events";

import { Viewer } from "./viewer";

export class Channel extends EventEmitter {
  private channelId: string;
  private mediaStream: MediaStream;
  private viewers: Viewer[];

  constructor(channelId: string, mediaStream: MediaStream) {
    super();
    this.channelId = channelId;
    this.mediaStream = mediaStream;
    this.viewers = [];
  }

  addViewer(newViewer: Viewer) {
    this.viewers.push(newViewer);
  }

  removeViewer(viewerToRemove: Viewer) {
    this.viewers = this.viewers.filter(v => v.getId() !== viewerToRemove.getId());
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
}