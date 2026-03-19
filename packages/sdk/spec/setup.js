/**
 * Node.js test setup — stubs browser-only WebRTC globals so that
 * ts-mockito can mock them and spec fixtures can call `new RTCSessionDescription()`.
 *
 * Loaded via `mocha --require ./spec/setup.js` before any test file.
 */

global.RTCSessionDescription = class RTCSessionDescription {
  constructor(init) {
    this.type = init?.type ?? "offer";
    this.sdp = init?.sdp ?? "";
  }
  toJSON() {
    return { type: this.type, sdp: this.sdp };
  }
};

global.RTCPeerConnection = class RTCPeerConnection {
  constructor() {
    this.iceGatheringState = "new";
    this.connectionState = "new";
    this.localDescription = null;
    this.remoteDescription = null;
    this.onicecandidate = null;
    this.onconnectionstatechange = null;
    this.onicegatheringstatechange = null;
  }
  createOffer() { return Promise.resolve({ type: "offer", sdp: "" }); }
  createAnswer() { return Promise.resolve({ type: "answer", sdp: "" }); }
  setLocalDescription() { return Promise.resolve(); }
  setRemoteDescription() { return Promise.resolve(); }
  addIceCandidate() { return Promise.resolve(); }
  addTrack() { return {}; }
  getSenders() { return []; }
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

global.MediaStream = class MediaStream {
  getTracks() { return []; }
  getAudioTracks() { return []; }
  getVideoTracks() { return []; }
};

global.MediaStreamTrack = class MediaStreamTrack {
  constructor() { this.kind = "audio"; }
  stop() {}
};
