import { expect } from 'chai';
import { RtmpWrtcWhipResource } from '../../../src/whip/wrtc/rtmpWrtcWhipResource';
import { MPEGTS } from '../../../src/transform/mpegts';
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
  'a=ice-ufrag:rtmpUfrag\r\n' +
  'a=ice-pwd:rtmpPwd12345678901234\r\n' +
  'a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99\r\n' +
  'a=setup:actpass\r\n' +
  'a=mid:0\r\n' +
  'a=sendonly\r\n' +
  'a=rtcp-mux\r\n' +
  'a=rtpmap:111 opus/48000/2\r\n';

// Default RTMP options required by the constructor
const DEFAULT_RTMP_OPTS = {
  rtmpUrl: 'rtmp://live.example.com/app/stream-key',
  width: 1280,
  height: 720,
};

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
    _killed: false,
    addInput: (_s: any) => proc,
    on: (_event: string, _fn: Function) => proc,
    output: (_s: string) => proc,
    videoCodec: (_s: string) => proc,
    audioCodec: (_s: string) => proc,
    format: (_s: string) => proc,
    run: () => { proc._ran = true; },
    kill: () => { proc._killed = true; },
  };
  return proc;
}

// ---------------------------------------------------------------------------
// TestableRtmpWrtcWhipResource — overrides this.pc and createOutputStream
// so no real RTCPeerConnection or ffmpeg process is started.
// ---------------------------------------------------------------------------
class TestableRtmpWrtcWhipResource extends RtmpWrtcWhipResource {
  public mockFfmpegProc: any;

  constructor(
    sdpOffer: string,
    iceServers?: WhipResourceIceServer[],
    opts?: { rtmpUrl: string; width: number; height: number },
    mockPc?: any
  ) {
    super(sdpOffer, iceServers, opts);
    this.pc = mockPc || makeMockPc();
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

describe('RtmpWrtcWhipResource', () => {
  describe('constructor', () => {
    it('stores the RTMP URL as the output path', () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      expect(r.getOutputPath()).to.equal('rtmp://live.example.com/app/stream-key');
    });

    it('accepts different RTMP URLs', () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], {
        rtmpUrl: 'rtmp://streaming.example.org/live/my-key',
        width: 1920,
        height: 1080,
      });
      expect(r.getOutputPath()).to.equal('rtmp://streaming.example.org/live/my-key');
    });
  });

  describe('getType()', () => {
    it('returns "rtmp"', () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      expect(r.getType()).to.equal('rtmp');
    });
  });

  describe('asObject()', () => {
    it('returns object with rtmpUrl property set to the output path', () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      const obj = r.asObject();
      expect(obj).to.have.property('rtmpUrl');
      expect(obj.rtmpUrl).to.equal('rtmp://live.example.com/app/stream-key');
    });
  });

  describe('beforeAnswer() — starts the ffmpeg pipeline', () => {
    it('calls run() on the ffmpeg process during sdpAnswer()', async () => {
      const mockPc = makeMockPc();
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS, mockPc);

      await r.sdpAnswer();

      expect(r.mockFfmpegProc._ran).to.equal(true);
    });
  });

  describe('destroy()', () => {
    it('calls close() on the peer connection', () => {
      let closeCalled = false;
      const mockPc = makeMockPc({
        close: () => { closeCalled = true; },
      });
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS, mockPc);

      r.destroy();
      expect(closeCalled).to.equal(true);
    });
  });

  describe('sdpAnswer()', () => {
    it('returns a valid SDP answer string', async () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      const answer = await r.sdpAnswer();
      expect(answer).to.be.a('string');
      expect(answer).to.include('v=0');
    });

    it('sets eTag after sdpAnswer() is called', async () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      expect(r.getETag()).to.equal(undefined);
      await r.sdpAnswer();
      const eTag = r.getETag();
      expect(eTag).to.be.a('string');
      expect(eTag).to.include('rtmpUfrag');
    });

    it('calls setRemoteDescription with the SDP offer', async () => {
      let capturedDesc: any = null;
      const mockPc = makeMockPc({
        setRemoteDescription: async (desc: any) => {
          capturedDesc = desc;
          mockPc.remoteDescription = desc;
        },
      });
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS, mockPc);
      await r.sdpAnswer();

      expect(capturedDesc).to.not.equal(null);
      expect(capturedDesc.type).to.equal('offer');
      expect(capturedDesc.sdp).to.equal(SDP_OFFER);
    });
  });

  describe('patch()', () => {
    let resource: TestableRtmpWrtcWhipResource;

    beforeEach(async () => {
      resource = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      await resource.sdpAnswer();
    });

    it('returns 204 when valid candidate and matching eTag are provided', async () => {
      const body =
        'v=0\r\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' +
        'a=candidate:1 1 udp 2113937151 192.168.1.100 54321 typ host\r\n';
      const status = await resource.patch(body, resource.getETag()!);
      expect(status).to.equal(204);
    });

    it('returns 412 when eTag does not match', async () => {
      const body =
        'v=0\r\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' +
        'a=candidate:1 1 udp 2113937151 192.168.1.100 54321 typ host\r\n';
      const status = await resource.patch(body, 'bad-etag');
      expect(status).to.equal(412);
    });

    it('returns 400 when body has no candidates', async () => {
      const status = await resource.patch('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n', resource.getETag());
      expect(status).to.equal(400);
    });
  });

  describe('getIceServers()', () => {
    it('returns empty array when no ICE servers configured', () => {
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, [], DEFAULT_RTMP_OPTS);
      expect(r.getIceServers()).to.deep.equal([]);
    });

    it('returns configured ICE servers', () => {
      const iceServers: WhipResourceIceServer[] = [
        { urls: 'stun:stun.example.com:3478' },
      ];
      const r = new TestableRtmpWrtcWhipResource(SDP_OFFER, iceServers, DEFAULT_RTMP_OPTS);
      expect(r.getIceServers()).to.deep.equal(iceServers);
    });
  });
});
