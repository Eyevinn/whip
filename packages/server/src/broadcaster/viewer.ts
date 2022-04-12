import { RTCPeerConnection, RTCDataChannel } from "wrtc";
import { v4 as uuidv4 } from "uuid";

import { BroadcasterICEServer } from ".";
import { EventEmitter } from "events";

const ICE_GATHERING_TIMEOUT = process.env.ICE_GATHERING_TIMEOUT ? parseInt(process.env.ICE_GATHERING_TIMEOUT) : 4000;
const CONNECTION_TIMEOUT = 60 * 1000;

export interface ViewerOptions {
  iceServers?: BroadcasterICEServer[];
}

export class Viewer extends EventEmitter {
  private channelId: string;
  private viewerId: string;
  private peer: RTCPeerConnection;
  private connectionTimeout: any;
  private dataChannels: RTCDataChannel[];

  constructor(channelId: string, opts) {
    super();
    this.channelId = channelId;
    this.viewerId = uuidv4();

    this.peer = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
      iceServers: opts.iceServers,
    });

    this.dataChannels = <RTCDataChannel>[];

    this.peer.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this);
    this.peer.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this);
    this.peer.onicecandidateerror = this.onIceCandidateError.bind(this);

    this.peer.onconnectionstatechange = this.onConnectionStateChange.bind(this);

    this.peer.ondatachannel = this.onEventDataChannel.bind(this);
  }

  private onIceGatheringStateChange(e) {
    this.log("IceGatheringState", this.peer.iceGatheringState);
  }
  
  private onIceConnectionStateChange(e) {
    this.log("IceConnectionState", this.peer.iceConnectionState);
  }

  private onIceCandidateError(e) {
    this.log("IceCandidateError", e);
  }

  private onConnectionStateChange(e) {
    this.log("ConnectionState", this.peer.connectionState);

    if (["disconnected", "failed"].includes(this.peer.connectionState)) {
      this.log(`watcher disconnected`);
      try {
        this.destroy();
      } catch (err) {
        console.error(err);
      }
      this.emit("disconnect");
    } else if (this.peer.connectionState === "connected") {
      this.log(`watcher connected, clear connection timer`);
      clearTimeout(this.connectionTimeout);
    } else if (this.peer.connectionState === "closed") {

    }
  }

  private onEventDataChannel(e) {
    this.log(`Event data channel established ${e.channel.label}`);
    const channel = e.channel;
    channel.onmessage = this.onEventDataChannelMessage.bind(this);
    this.dataChannels.push(channel);
  }

  private onEventDataChannelMessage(e) {
    this.log(`Received message from viewer on channel`, e.data);
    this.emit("message", e.data);
  }

  private async waitUntilIceGatheringStateComplete(): Promise<void> {
    if (this.peer.iceGatheringState === "complete") {
      return;
    }
  
    const p: Promise<void> = new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.peer.removeEventListener("icecandidate", onIceCandidateFn);
        this.log("ICE gathering timed out, send what we have");
        resolve();
      }, ICE_GATHERING_TIMEOUT);

      const onIceCandidate = ({ candidate }) => {
        if (!candidate) {
          clearTimeout(t);
          this.peer.removeEventListener("icecandidate", onIceCandidateFn);
          this.log("ICE candidates gathered");
          resolve();
        } else {
          this.log(candidate.candidate);
        }
      }
      const onIceCandidateFn = onIceCandidate.bind(this);
      this.peer.addEventListener("icecandidate", onIceCandidateFn);
    });
    await p;
  }

  private log(...args: any[]) {
    console.log(`SFU ${this.viewerId}`, ...args);
  }

  private closeDataChannels() {
    this.dataChannels.forEach(channel => channel.close());
  }

  getId() {
    return this.viewerId;
  }

  async handleOffer(offer: string, stream) {    
    await this.peer.setRemoteDescription({ 
      type: "offer", 
      sdp: offer 
    });

    for (const track of stream.getTracks()) {
      this.log(`Added track ${track.kind} from ${this.channelId}`);
      this.peer.addTrack(track, stream);
    }

    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    await this.waitUntilIceGatheringStateComplete();

    this.connectionTimeout = setTimeout(() => {
      clearTimeout(this.connectionTimeout);
      this.log("Connection timeout");
      this.closeDataChannels();
      this.peer.close();
    }, CONNECTION_TIMEOUT);

    this.emit("connect");
    return this.peer.localDescription.sdp;
  }

  send(channelLabel: string, message: any) {
    const channel = this.dataChannels.find(ch => ch.label === channelLabel);
    if (!channel) {
      this.log(`No channel with label ${channelLabel} found, not sending`);
      return;
    }

    if (channel.readyState !== "open") {
      this.log(`Channel with label ${channelLabel} is not open, not sending`);
      return;
    }
    channel.send(JSON.stringify(message));    
  }

  destroy() {
    this.log("Remove tracks from senders");
    this.peer.getSenders().map(sender => this.peer.removeTrack(sender));
    this.log("Close data channels");
    this.closeDataChannels();
    this.peer.close();
  }
}
