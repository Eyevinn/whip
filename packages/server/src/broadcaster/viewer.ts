import { RTCPeerConnection } from "wrtc";
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

  constructor(channelId: string, opts) {
    super();
    this.channelId = channelId;
    this.viewerId = uuidv4();

    this.peer = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
      iceServers: opts.iceServers,
    });

    this.peer.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this);
    this.peer.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this);
    this.peer.onicecandidateerror = this.onIceCandidateError.bind(this);

    this.peer.onconnectionstatechange = this.onConnectionStateChange.bind(this);    
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

    if (["disconnected", "closed", "failed"].includes(this.peer.connectionState)) {
      this.log(`watcher closed connection, remove track from senders`);
      try {
        this.peer.getSenders().map(sender => this.peer.removeTrack(sender));
      } catch (err) {
        console.error(err);
      }
      this.emit("disconnect");
      this.peer = null;
    } else if (this.peer.connectionState === "connected") {
      this.log(`watcher connected, clear connection timer`);
      clearTimeout(this.connectionTimeout);
    }
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
      this.peer.close();
      this.peer = null;
    }, CONNECTION_TIMEOUT);

    this.emit("connect");
    return this.peer.localDescription.sdp;
  }
}
