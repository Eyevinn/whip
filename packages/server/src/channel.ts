import { MediaStream } from "@koush/wrtc";
import { EventEmitter } from "events";
import { XMLBuilder } from "fast-xml-parser";
import { WhppViewer } from './whpp/whppViewer'
import { MediaStreamsInfo } from './mediaStreamsInfo'

export class Channel extends EventEmitter {
  private channelId: string;
  private mediaStream?: MediaStream;
  private viewers: Map<string, WhppViewer>;
  private mpdXml: string;
  private preroll: string;
  private sfuResourceId?: string;
  private mediaStreams?: MediaStreamsInfo;

  constructor(channelId: string, mediaStream?: MediaStream, sfuResourceId?: string, mediaStreams?: MediaStreamsInfo) {
    super();
    this.channelId = channelId;
    this.mediaStream = mediaStream;
    this.sfuResourceId = sfuResourceId;
    this.mediaStreams = mediaStreams;
    this.viewers = new Map();
    this.mpdXml;
    this.log(`Create Channel channelId ${channelId}, mediaStream ${mediaStream ? "set": "undefined"}, sfuResourceId ${sfuResourceId}, mediaStreams ${JSON.stringify(mediaStreams)}`);
  }

  private log(...args: any[]) {
    console.log(`[${this.channelId}]`, ...args);
  }

  assignPreRollMpd(mpdUrl: string) {
    this.preroll = mpdUrl;
  }

  addViewer(newViewer: WhppViewer) {
    this.viewers.set(newViewer.getId(), newViewer);
    this.log(`Add viewer ${newViewer.getId()} to ${this.channelId}, size ${this.viewers.size}`);
  }

  removeViewer(viewerToRemove: WhppViewer) {
    this.viewers.delete(viewerToRemove.getId());
  }

  getViewers(): WhppViewer[] {
    return Array.from(this.viewers.values());
  }

  getViewer(viewerId: string): WhppViewer | undefined {
    if (!this.viewers.has(viewerId)) {
      return undefined;
    }
    return this.viewers.get(viewerId);
  }

  getStream(): MediaStream | undefined {
    return this.mediaStream;
  }

  getSFUResourceId(): string | undefined {
    return this.sfuResourceId;
  }

  getMediaStreams(): MediaStreamsInfo | undefined {
    return this.mediaStreams;
  }

  getId(): string {
    return this.channelId;
  }

  generateMpdXml(link: string, rel: string) {
    const periods = [];

    if (this.preroll) {
      periods.push({
        "Period": {},
        ":@": {
          "@_xlink:href": this.preroll,
          "@_xlink:actuate": "onLoad" 
        },
      })
    }
    periods.push({
      "Period": [{
        "AdaptationSet": { },
        ":@": {
          "@_xlink:href": link,
          "@_xlink:rel": rel,
          "@_xlink:actuate": "onRequest"  
        }
      }],
    });

    const obj = [{
      "MPD": periods,
      ":@": {
        "@_profiles": "urn:mpeg:dash:profile:webrtc-live:2022",
        "@_type": "static",
        "@_xmlns": "urn:mpeg:dash:schema:mpd:2011",
        "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "@_xmlns:xlink": "http://www.w3.org/1999/xlink",
        "@_xsi:schemaLocation": "urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd"
      }
    }];

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      preserveOrder: true,
    });
    const output = builder.build(obj);
    return output;
  }

  destroy() {
  }
}
