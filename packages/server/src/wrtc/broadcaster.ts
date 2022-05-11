import { MediaStream } from "wrtc";
import { WHIPResource, WHIPResourceICEServer, IANA_PREFIX } from "../models/WHIPResource";

interface WRTCBroadcasterOptions {
  channelId?: string;
}

export class WRTCBroadcaster extends WHIPResource {
  private channelId: string;

  constructor(sdpOffer: string, iceServers?: WHIPResourceICEServer[], opts?: WRTCBroadcasterOptions) {
    super(sdpOffer, iceServers);
    this.channelId = this.getId();
    if (opts?.channelId) {
      this.channelId = opts.channelId;
    }
  }

  onIceConnectionStateChange(e) {
    if (this.pc.iceConnectionState === "closed") {
      this.log(`ICE connection stats is closed`);
      this.destroy();
      if (this.broadcaster) {
        this.log(`Removing channel with ID ${this.channelId}`);
        this.broadcaster.removeChannel(this.channelId);
      }
    }
  }

  async beforeAnswer() {
    const stream = new MediaStream(this.pc.getReceivers().map(receiver => receiver.track));
    this.log("Created MediaStream from receivers");

    if (this.broadcaster) {
      this.log(`Creating channel with ID ${this.channelId}`);
      try {
        this.broadcaster.createChannel(this.channelId, stream);
      } catch (err) {
        // Failed to create channel with requested Id, try again with the wrtc resource Id
        this.channelId = this.getId();
        this.broadcaster.createChannel(this.channelId, stream);
      }
    }
  }

  async ondatachannel(datachannel) {
    if (datachannel.label === "backchannel") {
      this.broadcaster.assignBackChannel(this.channelId, datachannel);
    }
  }

  async ondisconnect() {
    if (this.broadcaster) {
      this.log(`Removing channel with ID ${this.channelId} on disconnect`);
      this.broadcaster.removeChannel(this.channelId);
    }
  }

  getType() {
    return "broadcaster";
  }

  getProtocolExtensions(): string[] {
    const linkTypes = this.broadcaster.getLinkTypes(IANA_PREFIX);
    return [
      `<${this.broadcaster.getBaseUrl()}/channel>;rel=${linkTypes.list}`,
      `<${this.broadcaster.getBaseUrl()}/channel/${this.channelId}>;rel=${linkTypes.channel}`,
      `<${this.broadcaster.getBaseUrl()}/mpd/${this.channelId}>;rel=${linkTypes.mpd}`,
    ]
    /*
    return [
      `<${this.broadcaster.getBaseUrl()}/channel>;rel=${IANA_PREFIX}eyevinn-wrtc-channel-list`,
      `<${this.broadcaster.getBaseUrl()}/channel/${this.getId()}>;rel=${IANA_PREFIX}eyevinn-wrtc-channel`,
    ]
    */
  }

  asObject(): any {
    return {
      channel: `${this.broadcaster.getBaseUrl()}/channel/${this.channelId}`,
    }
  }

  destroy() {
    super.destroy();
    this.broadcaster.removeChannel(this.channelId);
  }
}