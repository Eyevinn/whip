import { RTCPeerConnection } from "wrtc";
import { v4 as uuidv4 } from "uuid";

import { BroadcasterICEServer } from ".";
import { EventEmitter } from "events";
import { ViewerAnswerRequest, ViewerCandidateRequest, ViewerMediaStream, ViewerOfferResponse } from './ViewerRequests'
import { parse } from 'sdp-transform'
import { Viewer } from './Viewer'

const ICE_GATHERING_TIMEOUT = process.env.ICE_GATHERING_TIMEOUT ? parseInt(process.env.ICE_GATHERING_TIMEOUT) : 4000;
const CONNECTION_TIMEOUT = 60 * 1000;

export interface ViewerOptions {
  iceServers?: BroadcasterICEServer[];
}

export class WRTCViewer extends EventEmitter implements Viewer {
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

  getId(): string {
    return this.viewerId;
  }

  async handlePost(stream: MediaStream): Promise<ViewerOfferResponse> {
    for (const track of stream.getTracks()) {
      this.log(`Added local track ${track.kind} from ${this.channelId}`);
      this.peer.addTrack(track, stream);
    }

    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    await this.waitUntilIceGatheringStateComplete();

    const viewerResponse: ViewerOfferResponse = {
      offer: this.peer.localDescription.sdp,
      mediaStreams: this.getMediaStreams()
    };

    this.connectionTimeout = setTimeout(() => {
      clearTimeout(this.connectionTimeout);
      this.log("Connection timeout");
      this.peer.close();
    }, CONNECTION_TIMEOUT);

    this.emit("connect");
    return viewerResponse;
  }

  async handlePut(request: ViewerAnswerRequest): Promise<void> {
    await this.peer.setRemoteDescription({
      type: 'answer',
      sdp: request.answer
    });
  }

  async handlePatch(request: ViewerCandidateRequest): Promise<void> {
    await this.peer.addIceCandidate({ candidate: request.candidate });
  }

  private getMediaStreams(): ViewerMediaStream[] {
    const parsedSdp = parse(this.peer.localDescription.sdp);
    let storedStreamIds = new Set<string>();
    let mediaStreams: ViewerMediaStream[] = [];

    for (let media of parsedSdp.media) {
      const msidSplit = media.msid && media.msid.split(' ');

      if (!msidSplit || msidSplit.length !== 2 || storedStreamIds.has(msidSplit[0])) {
        continue;
      }

      storedStreamIds.add(msidSplit[0]);
      mediaStreams.push({ streamId: msidSplit[0] });
    }

    return mediaStreams;
  }

  destroy() {
    this.log("Remove tracks from senders");
    this.peer.getSenders().map(sender => this.peer.removeTrack(sender));
    this.peer.close();
  }
}
