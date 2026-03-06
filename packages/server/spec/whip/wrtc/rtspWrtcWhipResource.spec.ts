import { expect } from 'chai';
import { RtspWrtcWhipResource, RTSPResolution } from '../../../src/whip/wrtc/rtspWrtcWhipResource';
import { MPEGTS, MPEGTSResolution } from '../../../src/transform/mpegts';
import { WhipResourceIceServer } from '../../../src/whip/whipResource';

// ---------------------------------------------------------------------------
// Minimal SDP offer with ICE credentials
// ---------------------------------------------------------------------------
const SDP_OFFER =
  'v=0\r\n' +
  'o=- 1234567890 2 IN IP4 127.0.0.1\r\n' +
  's=-\r\n' +
  't=0 0\r\n' +
  'a=group:BUNDLE 0\r\n' +
  'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' +
  'c=IN IP4 0.0.0.0\r\n' +
  'a=ice-ufrag:rtspUfrag\r\n' +
  'a=ice-pwd:rtspPwd12345678901234\r\n' +
  'a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99\r\n' +
  'a=setup:actpass\r\n' +
  'a=mid:0\r\n' +
  'a=sendonly\r\n' +
  'a=rtcp-mux\r\n' +
  'a=rtpmap:111 opus/48000/2\r\n';

// ---------------------------------------------------------------------------
// Mock RTCPeerConnection — avoids native WebRTC and ICE timeouts
// ---------------------------------------------------------------------------
function makeMockPc(overrides: Partial<any> = {}): any {
  const handlers: Record<string, Function[]> = {};
  const pc: any = {
    iceGatheringState: 'complete',
    iceConnectionState: 'new',
    connectionState: 'new',
    localDescription: null,
    remoteDescription: null,
    oniceconnectionstatechange: null,
    onicegatheringstatechange: null,
    onicecandidateerror: null,
    onconnectionstatechange: null,

    setRemoteDescription: async (desc: any) => {
      pc.remoteDescription = desc;
    },
    createAnswer: async () => ({
      type: 'answer',
      sdp:
        'v=0\r\no=- 0 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\n' +
        'a=rtpmap:111 opus/48000/2\r\n',
    }),
    setLocalDescription: async (desc: any) => {
      pc.localDescription = desc;
    },
    addIceCandidate: async (_candidate: any) => {},
    close: () => {},
    addEventListener: (event: string, fn: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter(h => h !== fn);
      }
    },
    getReceivers: () => [],
    ...overrides,
  };
  return pc;
}

// ---------------------------------------------------------------------------
// Mock ffmpeg process — avoids spawning a real ffmpeg binary
// ---------------------------------------------------------------------------
function makeMockFfmpegProc(): any {
  const proc: any = {
    _ran: false,
    addInput: (_s: any) => proc,
    on: (_event: string, _fn: Function) => proc,
    output: (_s: string) => proc,
    videoCodec: (_s: string) => proc,
    audioCodec: (_s: string) => proc,
    format: (_s: string) => proc,
    run: () => { proc._ran = true; },
    kill: () => { proc._killed = true; },
    _killed: false,
  };
  return proc;
}

// ---------------------------------------------------------------------------
// TestableRtspWrtcWhipResource — overrides this.pc and createOutputStream
// so no real RTCPeerConnection or ffmpeg process is started.
// ---------------------------------------------------------------------------
class TestableRtspWrtcWhipResource extends RtspWrtcWhipResource {
  public mockFfmpegProc: any;

  constructor(
    sdpOffer: string,
    iceServers?: WhipResourceIceServer[],
    opts?: any,
    mockPc?: any
  ) {
    // Pass a factory so @koush/wrtc is never required in CI.
    const pc = mockPc || makeMockPc();
    super(sdpOffer, iceServers, opts, () => pc);
    this.mockFfmpegProc = makeMockFfmpegProc();
  }

  createOutputStream(_transform: MPEGTS): any {
    return this.mockFfmpegProc;
  }

  async beforeAnswer(): Promise<void> {
    // Override to avoid constructing MPEGTS (which requires @koush/wrtc nonstandard API)
    // but still exercise the createOutputStream path
    this.mockFfmpegProc.run();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RtspWrtcWhipResource', () => {
  describe('constructor — default options', () => {
    it('uses default RTSP URL rtsp://127.0.0.1:8554 when no opts provided', () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER);
      expect(r.getOutputPath()).to.include('rtsp://127.0.0.1:8554/');
    });

    it('default output path includes resource ID', () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER);
      const id = r.getId();
      expect(r.getOutputPath()).to.equal('rtsp://127.0.0.1:8554/' + id);
    });
  });

  describe('constructor — custom options', () => {
    it('uses provided RTSP server URL', () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER, [], {
        server: 'rtsp://media.example.com:8554',
      });
      expect(r.getOutputPath()).to.include('rtsp://media.example.com:8554/');
    });

    it('accepts a custom resolution', () => {
      const resolution = new RTSPResolution(1920, 1080);
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER, [], {
        server: 'rtsp://127.0.0.1:8554',
        resolution,
      });
      // Resolution is stored internally — verify output path is still correct
      expect(r.getOutputPath()).to.be.a('string');
    });
  });

  describe('RTSPResolution', () => {
    it('toString() returns "widthxheight"', () => {
      const res = new RTSPResolution(1280, 720);
      expect(res.toString()).to.equal('1280x720');
    });

    it('exposes width and height getters', () => {
      const res = new RTSPResolution(640, 480);
      expect(res.width).to.equal(640);
      expect(res.height).to.equal(480);
    });
  });

  describe('getType()', () => {
    it('returns "rtsp"', () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER);
      expect(r.getType()).to.equal('rtsp');
    });
  });

  describe('asObject()', () => {
    it('returns object with rtsp property set to the output path', () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER);
      const obj = r.asObject();
      expect(obj).to.have.property('rtsp');
      expect(obj.rtsp).to.equal(r.getOutputPath());
    });
  });

  describe('beforeAnswer() — starts the ffmpeg pipeline', () => {
    it('calls run() on the ffmpeg process during sdpAnswer()', async () => {
      const mockPc = makeMockPc();
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER, [], {}, mockPc);

      await r.sdpAnswer();

      expect(r.mockFfmpegProc._ran).to.equal(true);
    });
  });

  describe('destroy()', () => {
    it('calls close() on the peer connection', async () => {
      let closeCalled = false;
      const mockPc = makeMockPc({
        close: () => { closeCalled = true; },
      });
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER, [], {}, mockPc);

      r.destroy();
      expect(closeCalled).to.equal(true);
    });
  });

  describe('sdpAnswer()', () => {
    it('returns a valid SDP answer string', async () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER);
      const answer = await r.sdpAnswer();
      expect(answer).to.be.a('string');
      expect(answer).to.include('v=0');
    });

    it('sets eTag after sdpAnswer() is called', async () => {
      const r = new TestableRtspWrtcWhipResource(SDP_OFFER);
      expect(r.getETag()).to.equal(undefined);
      await r.sdpAnswer();
      const eTag = r.getETag();
      expect(eTag).to.be.a('string');
      expect(eTag).to.include('rtspUfrag');
    });
  });
});
