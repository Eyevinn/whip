import { mock, reset, instance, when, anything, verify, anyString } from 'ts-mockito'
import { SmbProtocol } from '../../../src/smb/smbProtocol'
import { SfuWhipResource } from '../../../src/whip/sfu/sfuWhipResource'
import { Broadcaster } from '../../../src/broadcaster'
import { expect } from 'chai'

const SDP = "v=0\r\n" +
  "o=- 3125943358136748722 2 IN IP4 127.0.0.1\r\n" +
  "s=-\r\n" +
  "t=0 0\r\n" +
  "a=group:BUNDLE 0 1\r\n" +
  "a=extmap-allow-mixed\r\n" +
  "a=msid-semantic: WMS nBMIpOJLdfkNjudsR17FxgUxBVVElIyGvZLg\r\n" +
  "m=audio 9 UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126\r\n" +
  "c=IN IP4 0.0.0.0\r\n" +
  "a=rtcp:9 IN IP4 0.0.0.0\r\n" +
  "a=ice-ufrag:FfqY\r\n" +
  "a=ice-pwd:jm9+mJGbRVvm0GHPm0zYCiR9\r\n" +
  "a=ice-options:trickle\r\n" +
  "a=fingerprint:sha-256 B0:53:33:06:5B:2F:03:AD:C5:2D:59:B8:96:74:9F:19:39:76:38:76:F0:BD:1B:38:52:D3:C8:25:6E:45:39:D7\r\n" +
  "a=setup:actpass\r\n" +
  "a=mid:0\r\n" +
  "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n" +
  "a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n" +
  "a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\n" +
  "a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\n" +
  "a=sendonly\r\n" +
  "a=msid:nBMIpOJLdfkNjudsR17FxgUxBVVElIyGvZLg a630b901-5e8e-4963-83f2-0c220aa18b6e\r\n" +
  "a=rtcp-mux\r\n" +
  "a=rtpmap:111 opus/48000/2\r\n" +
  "a=rtcp-fb:111 transport-cc\r\n" +
  "a=fmtp:111 minptime=10;useinbandfec=1\r\n" +
  "a=rtpmap:63 red/48000/2\r\n" +
  "a=fmtp:63 111/111\r\n" +
  "a=rtpmap:103 ISAC/16000\r\n" +
  "a=rtpmap:104 ISAC/32000\r\n" +
  "a=rtpmap:9 G722/8000\r\n" +
  "a=rtpmap:0 PCMU/8000\r\n" +
  "a=rtpmap:8 PCMA/8000\r\n" +
  "a=rtpmap:106 CN/32000\r\n" +
  "a=rtpmap:105 CN/16000\r\n" +
  "a=rtpmap:13 CN/8000\r\n" +
  "a=rtpmap:110 telephone-event/48000\r\n" +
  "a=rtpmap:112 telephone-event/32000\r\n" +
  "a=rtpmap:113 telephone-event/16000\r\n" +
  "a=rtpmap:126 telephone-event/8000\r\n" +
  "a=ssrc:1719004830 cname:wlcEKuJOsdPyf0rd\r\n" +
  "a=ssrc:1719004830 msid:nBMIpOJLdfkNjudsR17FxgUxBVVElIyGvZLg a630b901-5e8e-4963-83f2-0c220aa18b6e\r\n" +
  "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127 121 125 107 108 109 124 120 123 119 35 36 41 42 114 115 116 117 118\r\n" +
  "c=IN IP4 0.0.0.0\r\n" +
  "a=rtcp:9 IN IP4 0.0.0.0\r\n" +
  "a=ice-ufrag:FfqY\r\n" +
  "a=ice-pwd:jm9+mJGbRVvm0GHPm0zYCiR9\r\n" +
  "a=ice-options:trickle\r\n" +
  "a=fingerprint:sha-256 B0:53:33:06:5B:2F:03:AD:C5:2D:59:B8:96:74:9F:19:39:76:38:76:F0:BD:1B:38:52:D3:C8:25:6E:45:39:D7\r\n" +
  "a=setup:actpass\r\n" +
  "a=mid:1\r\n" +
  "a=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r\n" +
  "a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n" +
  "a=extmap:13 urn:3gpp:video-orientation\r\n" +
  "a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\n" +
  "a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\n" +
  "a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\n" +
  "a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\n" +
  "a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\r\n" +
  "a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\n" +
  "a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\r\n" +
  "a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\r\n" +
  "a=sendonly\r\n" +
  "a=msid:nBMIpOJLdfkNjudsR17FxgUxBVVElIyGvZLg fe404de6-a422-4d48-b387-661489b9aeec\r\n" +
  "a=rtcp-mux\r\n" +
  "a=rtcp-rsize\r\n" +
  "a=rtpmap:96 VP8/90000\r\n" +
  "a=rtcp-fb:96 goog-remb\r\n" +
  "a=rtcp-fb:96 transport-cc\r\n" +
  "a=rtcp-fb:96 ccm fir\r\n" +
  "a=rtcp-fb:96 nack\r\n" +
  "a=rtcp-fb:96 nack pli\r\n" +
  "a=rtpmap:97 rtx/90000\r\n" +
  "a=fmtp:97 apt=96\r\n" +
  "a=rtpmap:98 VP9/90000\r\n" +
  "a=rtcp-fb:98 goog-remb\r\n" +
  "a=rtcp-fb:98 transport-cc\r\n" +
  "a=rtcp-fb:98 ccm fir\r\n" +
  "a=rtcp-fb:98 nack\r\n" +
  "a=rtcp-fb:98 nack pli\r\n" +
  "a=fmtp:98 profile-id=0\r\n" +
  "a=rtpmap:99 rtx/90000\r\n" +
  "a=fmtp:99 apt=98\r\n" +
  "a=rtpmap:100 VP9/90000\r\n" +
  "a=rtcp-fb:100 goog-remb\r\n" +
  "a=rtcp-fb:100 transport-cc\r\n" +
  "a=rtcp-fb:100 ccm fir\r\n" +
  "a=rtcp-fb:100 nack\r\n" +
  "a=rtcp-fb:100 nack pli\r\n" +
  "a=fmtp:100 profile-id=2\r\n" +
  "a=rtpmap:101 rtx/90000\r\n" +
  "a=fmtp:101 apt=100\r\n" +
  "a=rtpmap:127 H264/90000\r\n" +
  "a=rtcp-fb:127 goog-remb\r\n" +
  "a=rtcp-fb:127 transport-cc\r\n" +
  "a=rtcp-fb:127 ccm fir\r\n" +
  "a=rtcp-fb:127 nack\r\n" +
  "a=rtcp-fb:127 nack pli\r\n" +
  "a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\n" +
  "a=rtpmap:121 rtx/90000\r\n" +
  "a=fmtp:121 apt=127\r\n" +
  "a=rtpmap:125 H264/90000\r\n" +
  "a=rtcp-fb:125 goog-remb\r\n" +
  "a=rtcp-fb:125 transport-cc\r\n" +
  "a=rtcp-fb:125 ccm fir\r\n" +
  "a=rtcp-fb:125 nack\r\n" +
  "a=rtcp-fb:125 nack pli\r\n" +
  "a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\n" +
  "a=rtpmap:107 rtx/90000\r\n" +
  "a=fmtp:107 apt=125\r\n" +
  "a=rtpmap:108 H264/90000\r\n" +
  "a=rtcp-fb:108 goog-remb\r\n" +
  "a=rtcp-fb:108 transport-cc\r\n" +
  "a=rtcp-fb:108 ccm fir\r\n" +
  "a=rtcp-fb:108 nack\r\n" +
  "a=rtcp-fb:108 nack pli\r\n" +
  "a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\n" +
  "a=rtpmap:109 rtx/90000\r\n" +
  "a=fmtp:109 apt=108\r\n" +
  "a=rtpmap:124 H264/90000\r\n" +
  "a=rtcp-fb:124 goog-remb\r\n" +
  "a=rtcp-fb:124 transport-cc\r\n" +
  "a=rtcp-fb:124 ccm fir\r\n" +
  "a=rtcp-fb:124 nack\r\n" +
  "a=rtcp-fb:124 nack pli\r\n" +
  "a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\n" +
  "a=rtpmap:120 rtx/90000\r\n" +
  "a=fmtp:120 apt=124\r\n" +
  "a=rtpmap:123 H264/90000\r\n" +
  "a=rtcp-fb:123 goog-remb\r\n" +
  "a=rtcp-fb:123 transport-cc\r\n" +
  "a=rtcp-fb:123 ccm fir\r\n" +
  "a=rtcp-fb:123 nack\r\n" +
  "a=rtcp-fb:123 nack pli\r\n" +
  "a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f\r\n" +
  "a=rtpmap:119 rtx/90000\r\n" +
  "a=fmtp:119 apt=123\r\n" +
  "a=rtpmap:35 H264/90000\r\n" +
  "a=rtcp-fb:35 goog-remb\r\n" +
  "a=rtcp-fb:35 transport-cc\r\n" +
  "a=rtcp-fb:35 ccm fir\r\n" +
  "a=rtcp-fb:35 nack\r\n" +
  "a=rtcp-fb:35 nack pli\r\n" +
  "a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f\r\n" +
  "a=rtpmap:36 rtx/90000\r\n" +
  "a=fmtp:36 apt=35\r\n" +
  "a=rtpmap:41 AV1/90000\r\n" +
  "a=rtcp-fb:41 goog-remb\r\n" +
  "a=rtcp-fb:41 transport-cc\r\n" +
  "a=rtcp-fb:41 ccm fir\r\n" +
  "a=rtcp-fb:41 nack\r\n" +
  "a=rtcp-fb:41 nack pli\r\n" +
  "a=rtpmap:42 rtx/90000\r\n" +
  "a=fmtp:42 apt=41\r\n" +
  "a=rtpmap:114 H264/90000\r\n" +
  "a=rtcp-fb:114 goog-remb\r\n" +
  "a=rtcp-fb:114 transport-cc\r\n" +
  "a=rtcp-fb:114 ccm fir\r\n" +
  "a=rtcp-fb:114 nack\r\n" +
  "a=rtcp-fb:114 nack pli\r\n" +
  "a=fmtp:114 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f\r\n" +
  "a=rtpmap:115 rtx/90000\r\n" +
  "a=fmtp:115 apt=114\r\n" +
  "a=rtpmap:116 red/90000\r\n" +
  "a=rtpmap:117 rtx/90000\r\n" +
  "a=fmtp:117 apt=116\r\n" +
  "a=rtpmap:118 ulpfec/90000\r\n" +
  "a=ssrc-group:FID 802171845 2484338656\r\n" +
  "a=ssrc:802171845 cname:wlcEKuJOsdPyf0rd\r\n" +
  "a=ssrc:802171845 msid:nBMIpOJLdfkNjudsR17FxgUxBVVElIyGvZLg fe404de6-a422-4d48-b387-661489b9aeec\r\n" +
  "a=ssrc:2484338656 cname:wlcEKuJOsdPyf0rd\r\n" +
  "a=ssrc:2484338656 msid:nBMIpOJLdfkNjudsR17FxgUxBVVElIyGvZLg fe404de6-a422-4d48-b387-661489b9aeec\r\n";

const ENDPOINT_DESCRIPTION = '{"audio":{"payload-type":{"channels":2,"clockrate":48000,"id":111,"name":"opus","parameters":{"minptime":"10","useinbandfec":"1"},"rtcp-fbs":[]},"rtp-hdrexts":[{"id":1,"uri":"urn:ietf:params:rtp-hdrext:ssrc-audio-level"},{"id":3,"uri":"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"}],"ssrcs":[1202833541]},"bundle-transport":{"dtls":{"hash":"C6:7E:28:15:15:EE:94:27:97:B2:2E:FB:C9:0F:F9:10:98:F6:D4:93:FA:6E:BD:C9:C9:83:EB:F9:6C:FD:F2:44","setup":"actpass","type":"sha-256"},"ice":{"candidates":[{"component":1,"foundation":"388263418592","generation":0,"ip":"10.247.169.157","network":1,"port":15624,"priority":142541055,"protocol":"udp","type":"host"}],"pwd":"5hjxS4H1Lu853HWahE52d4TW","ufrag":"s4VRnuPHoTgTT2"},"rtcp-mux":true},"video":{"payload-types":[{"clockrate":90000,"id":100,"name":"VP8","parameters":{},"rtcp-fbs":[{"type":"goog-remb"},{"type":"nack"},{"subtype":"pli","type":"nack"}]},{"clockrate":90000,"id":96,"name":"rtx","parameters":{"apt":"100"},"rtcp-fbs":[]}],"rtp-hdrexts":[{"id":3,"uri":"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"},{"id":4,"uri":"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id"}],"ssrc-attributes":[],"ssrc-groups":[],"ssrcs":[871456177]}}';

const broadcaster = mock(Broadcaster);
const smbProtocol = mock(SmbProtocol);
let sfuWhipResource: SfuWhipResource | undefined;

describe('SfuWhipResource tests', () => {
  beforeEach(() => {
    sfuWhipResource = new SfuWhipResource(false, () => instance(smbProtocol), SDP, 'channelId');
    sfuWhipResource.assignBroadcaster(instance(broadcaster));

    when(smbProtocol.allocateConference(anyString())).thenResolve('conferenceId');
    when(smbProtocol.allocateEndpoint(anyString(), anything(), anything(), anything(), anything(), anything())).thenResolve(JSON.parse(ENDPOINT_DESCRIPTION));
    when(smbProtocol.getConferences(anyString())).thenResolve([]);
  })

  afterEach(() => {
    reset(broadcaster);
    reset(smbProtocol);
  })

  it('connect, no datachannel', async () => {
    await sfuWhipResource?.connect();
    verify(smbProtocol.allocateConference(anyString())).once();
    verify(smbProtocol.allocateEndpoint(anyString(), 'conferenceId', anyString(), true, true, false)).once();

    verify(smbProtocol.configureEndpoint(anyString(), 'conferenceId', anyString(), anything())).once();
    
    const sdpAnswer = await sfuWhipResource?.sdpAnswer();
    expect(sdpAnswer).not.eq(undefined);
  });
});
