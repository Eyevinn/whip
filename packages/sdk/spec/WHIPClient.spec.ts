import { WHIPClient } from '../src/index'
import { anyString, mock, reset, when, instance, verify, anything, strictEqual } from 'ts-mockito'
import { WHIPProtocol } from '../src/WHIPProtocol';

const dummySdpOffer: RTCSessionDescription = new RTCSessionDescription({
    type: 'offer',
    sdp: 'v=0\r\n' +
        'o=- 7184572474817234294 2 IN IP4 127.0.0.1\r\n' +
        's=-\r\n' +
        't=0 0\r\n' +
        'a=group:BUNDLE 0 1 2\r\n' +
        'a=extmap-allow-mixed\r\n' +
        'a=msid-semantic: WMS vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
        'a=ice-ufrag:1APu\r\n' +
        'a=ice-pwd:ZASYtA+D6s7vaTTr7gLLioMr\r\n' +
        'a=ice-options:trickle\r\n' +
        'a=fingerprint:sha-256 89:04:B1:13:EA:FB:30:21:D3:43:7F:7B:CF:B0:CD:46:BF:F0:19:8F:57:96:0E:E6:FC:76:AA:FB:2D:0E:4F:D3\r\n' +
        'a=setup:actpass\r\n' +
        'a=mid:0\r\n' +
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n' +
        'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
        'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\n' +
        'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\n' +
        'a=sendonly\r\n' +
        'a=msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r 38d080d8-6a53-4b4a-92d3-18e9e2b3ed41\r\n' +
        'a=rtcp-mux\r\n' +
        'a=rtpmap:111 opus/48000/2\r\n' +
        'a=rtcp-fb:111 transport-cc\r\n' +
        'a=fmtp:111 minptime=10;useinbandfec=1\r\n' +
        'a=rtpmap:63 red/48000/2\r\n' +
        'a=fmtp:63 111/111\r\n' +
        'a=rtpmap:103 ISAC/16000\r\n' +
        'a=rtpmap:104 ISAC/32000\r\n' +
        'a=rtpmap:9 G722/8000\r\n' +
        'a=rtpmap:0 PCMU/8000\r\n' +
        'a=rtpmap:8 PCMA/8000\r\n' +
        'a=rtpmap:106 CN/32000\r\n' +
        'a=rtpmap:105 CN/16000\r\n' +
        'a=rtpmap:13 CN/8000\r\n' +
        'a=rtpmap:110 telephone-event/48000\r\n' +
        'a=rtpmap:112 telephone-event/32000\r\n' +
        'a=rtpmap:113 telephone-event/16000\r\n' +
        'a=rtpmap:126 telephone-event/8000\r\n' +
        'a=ssrc:331969011 cname:+GjZY9VzWLB5PdLx\r\n' +
        'a=ssrc:331969011 msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r 38d080d8-6a53-4b4a-92d3-18e9e2b3ed41\r\n' +
        'a=ssrc:331969011 mslabel:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'a=ssrc:331969011 label:38d080d8-6a53-4b4a-92d3-18e9e2b3ed41\r\n' +
        'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127 121 125 107 108 109 124 120 123 119 35 36 41 42 114 115 116\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
        'a=ice-ufrag:1APu\r\n' +
        'a=ice-pwd:ZASYtA+D6s7vaTTr7gLLioMr\r\n' +
        'a=ice-options:trickle\r\n' +
        'a=fingerprint:sha-256 89:04:B1:13:EA:FB:30:21:D3:43:7F:7B:CF:B0:CD:46:BF:F0:19:8F:57:96:0E:E6:FC:76:AA:FB:2D:0E:4F:D3\r\n' +
        'a=setup:actpass\r\n' +
        'a=mid:1\r\n' +
        'a=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r\n' +
        'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
        'a=extmap:13 urn:3gpp:video-orientation\r\n' +
        'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\n' +
        'a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\n' +
        'a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\n' +
        'a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\n' +
        'a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\r\n' +
        'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\n' +
        'a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\r\n' +
        'a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\r\n' +
        'a=sendonly\r\n' +
        'a=msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=rtcp-mux\r\n' +
        'a=rtcp-rsize\r\n' +
        'a=rtpmap:96 VP8/90000\r\n' +
        'a=rtcp-fb:96 goog-remb\r\n' +
        'a=rtcp-fb:96 transport-cc\r\n' +
        'a=rtcp-fb:96 ccm fir\r\n' +
        'a=rtcp-fb:96 nack\r\n' +
        'a=rtcp-fb:96 nack pli\r\n' +
        'a=rtpmap:97 rtx/90000\r\n' +
        'a=fmtp:97 apt=96\r\n' +
        'a=rtpmap:98 VP9/90000\r\n' +
        'a=rtcp-fb:98 goog-remb\r\n' +
        'a=rtcp-fb:98 transport-cc\r\n' +
        'a=rtcp-fb:98 ccm fir\r\n' +
        'a=rtcp-fb:98 nack\r\n' +
        'a=rtcp-fb:98 nack pli\r\n' +
        'a=fmtp:98 profile-id=0\r\n' +
        'a=rtpmap:99 rtx/90000\r\n' +
        'a=fmtp:99 apt=98\r\n' +
        'a=rtpmap:100 VP9/90000\r\n' +
        'a=rtcp-fb:100 goog-remb\r\n' +
        'a=rtcp-fb:100 transport-cc\r\n' +
        'a=rtcp-fb:100 ccm fir\r\n' +
        'a=rtcp-fb:100 nack\r\n' +
        'a=rtcp-fb:100 nack pli\r\n' +
        'a=fmtp:100 profile-id=2\r\n' +
        'a=rtpmap:101 rtx/90000\r\n' +
        'a=fmtp:101 apt=100\r\n' +
        'a=rtpmap:127 H264/90000\r\n' +
        'a=rtcp-fb:127 goog-remb\r\n' +
        'a=rtcp-fb:127 transport-cc\r\n' +
        'a=rtcp-fb:127 ccm fir\r\n' +
        'a=rtcp-fb:127 nack\r\n' +
        'a=rtcp-fb:127 nack pli\r\n' +
        'a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\n' +
        'a=rtpmap:121 rtx/90000\r\n' +
        'a=fmtp:121 apt=127\r\n' +
        'a=rtpmap:125 H264/90000\r\n' +
        'a=rtcp-fb:125 goog-remb\r\n' +
        'a=rtcp-fb:125 transport-cc\r\n' +
        'a=rtcp-fb:125 ccm fir\r\n' +
        'a=rtcp-fb:125 nack\r\n' +
        'a=rtcp-fb:125 nack pli\r\n' +
        'a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\n' +
        'a=rtpmap:107 rtx/90000\r\n' +
        'a=fmtp:107 apt=125\r\n' +
        'a=rtpmap:108 H264/90000\r\n' +
        'a=rtcp-fb:108 goog-remb\r\n' +
        'a=rtcp-fb:108 transport-cc\r\n' +
        'a=rtcp-fb:108 ccm fir\r\n' +
        'a=rtcp-fb:108 nack\r\n' +
        'a=rtcp-fb:108 nack pli\r\n' +
        'a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\n' +
        'a=rtpmap:109 rtx/90000\r\n' +
        'a=fmtp:109 apt=108\r\n' +
        'a=rtpmap:124 H264/90000\r\n' +
        'a=rtcp-fb:124 goog-remb\r\n' +
        'a=rtcp-fb:124 transport-cc\r\n' +
        'a=rtcp-fb:124 ccm fir\r\n' +
        'a=rtcp-fb:124 nack\r\n' +
        'a=rtcp-fb:124 nack pli\r\n' +
        'a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\n' +
        'a=rtpmap:120 rtx/90000\r\n' +
        'a=fmtp:120 apt=124\r\n' +
        'a=rtpmap:123 H264/90000\r\n' +
        'a=rtcp-fb:123 goog-remb\r\n' +
        'a=rtcp-fb:123 transport-cc\r\n' +
        'a=rtcp-fb:123 ccm fir\r\n' +
        'a=rtcp-fb:123 nack\r\n' +
        'a=rtcp-fb:123 nack pli\r\n' +
        'a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f\r\n' +
        'a=rtpmap:119 rtx/90000\r\n' +
        'a=fmtp:119 apt=123\r\n' +
        'a=rtpmap:35 H264/90000\r\n' +
        'a=rtcp-fb:35 goog-remb\r\n' +
        'a=rtcp-fb:35 transport-cc\r\n' +
        'a=rtcp-fb:35 ccm fir\r\n' +
        'a=rtcp-fb:35 nack\r\n' +
        'a=rtcp-fb:35 nack pli\r\n' +
        'a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f\r\n' +
        'a=rtpmap:36 rtx/90000\r\n' +
        'a=fmtp:36 apt=35\r\n' +
        'a=rtpmap:41 AV1/90000\r\n' +
        'a=rtcp-fb:41 goog-remb\r\n' +
        'a=rtcp-fb:41 transport-cc\r\n' +
        'a=rtcp-fb:41 ccm fir\r\n' +
        'a=rtcp-fb:41 nack\r\n' +
        'a=rtcp-fb:41 nack pli\r\n' +
        'a=rtpmap:42 rtx/90000\r\n' +
        'a=fmtp:42 apt=41\r\n' +
        'a=rtpmap:114 red/90000\r\n' +
        'a=rtpmap:115 rtx/90000\r\n' +
        'a=fmtp:115 apt=114\r\n' +
        'a=rtpmap:116 ulpfec/90000\r\n' +
        'a=ssrc-group:FID 746033012 2865150791\r\n' +
        'a=ssrc:746033012 cname:+GjZY9VzWLB5PdLx\r\n' +
        'a=ssrc:746033012 msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=ssrc:746033012 mslabel:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'a=ssrc:746033012 label:f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=ssrc:2865150791 cname:+GjZY9VzWLB5PdLx\r\n' +
        'a=ssrc:2865150791 msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=ssrc:2865150791 mslabel:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'a=ssrc:2865150791 label:f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=ice-ufrag:1APu\r\n' +
        'a=ice-pwd:ZASYtA+D6s7vaTTr7gLLioMr\r\n' +
        'a=ice-options:trickle\r\n' +
        'a=fingerprint:sha-256 89:04:B1:13:EA:FB:30:21:D3:43:7F:7B:CF:B0:CD:46:BF:F0:19:8F:57:96:0E:E6:FC:76:AA:FB:2D:0E:4F:D3\r\n' +
        'a=setup:actpass\r\n' +
        'a=mid:2\r\n' +
        'a=sctp-port:5000\r\n' +
        'a=max-message-size:262144\r\n'
});

const dummySdpOfferWithCandidates: RTCSessionDescription = new RTCSessionDescription({
    type: 'offer',
    sdp: 'v=0\r\n' +
        'o=- 7184572474817234294 2 IN IP4 127.0.0.1\r\n' +
        's=-\r\n' +
        't=0 0\r\n' +
        'a=group:BUNDLE 0 1 2\r\n' +
        'a=extmap-allow-mixed\r\n' +
        'a=msid-semantic: WMS vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
        'a=ice-ufrag:1APu\r\n' +
        'a=ice-pwd:ZASYtA+D6s7vaTTr7gLLioMr\r\n' +
        'a=ice-options:trickle\r\n' +
        'a=fingerprint:sha-256 89:04:B1:13:EA:FB:30:21:D3:43:7F:7B:CF:B0:CD:46:BF:F0:19:8F:57:96:0E:E6:FC:76:AA:FB:2D:0E:4F:D3\r\n' +
        'a=setup:actpass\r\n' +
        'a=mid:0\r\n' +
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n' +
        'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
        'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\n' +
        'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\n' +
        'a=sendonly\r\n' +
        'a=msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r 38d080d8-6a53-4b4a-92d3-18e9e2b3ed41\r\n' +
        'a=rtcp-mux\r\n' +
        'a=rtpmap:111 opus/48000/2\r\n' +
        'a=rtcp-fb:111 transport-cc\r\n' +
        'a=fmtp:111 minptime=10;useinbandfec=1\r\n' +
        'a=rtpmap:63 red/48000/2\r\n' +
        'a=fmtp:63 111/111\r\n' +
        'a=rtpmap:103 ISAC/16000\r\n' +
        'a=rtpmap:104 ISAC/32000\r\n' +
        'a=rtpmap:9 G722/8000\r\n' +
        'a=rtpmap:0 PCMU/8000\r\n' +
        'a=rtpmap:8 PCMA/8000\r\n' +
        'a=rtpmap:106 CN/32000\r\n' +
        'a=rtpmap:105 CN/16000\r\n' +
        'a=rtpmap:13 CN/8000\r\n' +
        'a=rtpmap:110 telephone-event/48000\r\n' +
        'a=rtpmap:112 telephone-event/32000\r\n' +
        'a=rtpmap:113 telephone-event/16000\r\n' +
        'a=rtpmap:126 telephone-event/8000\r\n' +
        'a=ssrc:331969011 cname:+GjZY9VzWLB5PdLx\r\n' +
        'a=ssrc:331969011 msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r 38d080d8-6a53-4b4a-92d3-18e9e2b3ed41\r\n' +
        'a=ssrc:331969011 mslabel:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'a=ssrc:331969011 label:38d080d8-6a53-4b4a-92d3-18e9e2b3ed41\r\n' +
        'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127 121 125 107 108 109 124 120 123 119 35 36 41 42 114 115 116\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:9 IN IP4 0.0.0.0\r\n' +
        'a=ice-ufrag:1APu\r\n' +
        'a=ice-pwd:ZASYtA+D6s7vaTTr7gLLioMr\r\n' +
        'a=ice-options:trickle\r\n' +
        'a=fingerprint:sha-256 89:04:B1:13:EA:FB:30:21:D3:43:7F:7B:CF:B0:CD:46:BF:F0:19:8F:57:96:0E:E6:FC:76:AA:FB:2D:0E:4F:D3\r\n' +
        'a=setup:actpass\r\n' +
        'a=mid:1\r\n' +
        'a=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r\n' +
        'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
        'a=extmap:13 urn:3gpp:video-orientation\r\n' +
        'a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\n' +
        'a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\n' +
        'a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\n' +
        'a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\n' +
        'a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\r\n' +
        'a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\r\n' +
        'a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\r\n' +
        'a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\r\n' +
        'a=sendonly\r\n' +
        'a=msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=rtcp-mux\r\n' +
        'a=rtcp-rsize\r\n' +
        'a=rtpmap:96 VP8/90000\r\n' +
        'a=rtcp-fb:96 goog-remb\r\n' +
        'a=rtcp-fb:96 transport-cc\r\n' +
        'a=rtcp-fb:96 ccm fir\r\n' +
        'a=rtcp-fb:96 nack\r\n' +
        'a=rtcp-fb:96 nack pli\r\n' +
        'a=rtpmap:97 rtx/90000\r\n' +
        'a=fmtp:97 apt=96\r\n' +
        'a=rtpmap:98 VP9/90000\r\n' +
        'a=rtcp-fb:98 goog-remb\r\n' +
        'a=rtcp-fb:98 transport-cc\r\n' +
        'a=rtcp-fb:98 ccm fir\r\n' +
        'a=rtcp-fb:98 nack\r\n' +
        'a=rtcp-fb:98 nack pli\r\n' +
        'a=fmtp:98 profile-id=0\r\n' +
        'a=rtpmap:99 rtx/90000\r\n' +
        'a=fmtp:99 apt=98\r\n' +
        'a=rtpmap:100 VP9/90000\r\n' +
        'a=rtcp-fb:100 goog-remb\r\n' +
        'a=rtcp-fb:100 transport-cc\r\n' +
        'a=rtcp-fb:100 ccm fir\r\n' +
        'a=rtcp-fb:100 nack\r\n' +
        'a=rtcp-fb:100 nack pli\r\n' +
        'a=fmtp:100 profile-id=2\r\n' +
        'a=rtpmap:101 rtx/90000\r\n' +
        'a=fmtp:101 apt=100\r\n' +
        'a=rtpmap:127 H264/90000\r\n' +
        'a=rtcp-fb:127 goog-remb\r\n' +
        'a=rtcp-fb:127 transport-cc\r\n' +
        'a=rtcp-fb:127 ccm fir\r\n' +
        'a=rtcp-fb:127 nack\r\n' +
        'a=rtcp-fb:127 nack pli\r\n' +
        'a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\n' +
        'a=rtpmap:121 rtx/90000\r\n' +
        'a=fmtp:121 apt=127\r\n' +
        'a=rtpmap:125 H264/90000\r\n' +
        'a=rtcp-fb:125 goog-remb\r\n' +
        'a=rtcp-fb:125 transport-cc\r\n' +
        'a=rtcp-fb:125 ccm fir\r\n' +
        'a=rtcp-fb:125 nack\r\n' +
        'a=rtcp-fb:125 nack pli\r\n' +
        'a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\n' +
        'a=rtpmap:107 rtx/90000\r\n' +
        'a=fmtp:107 apt=125\r\n' +
        'a=rtpmap:108 H264/90000\r\n' +
        'a=rtcp-fb:108 goog-remb\r\n' +
        'a=rtcp-fb:108 transport-cc\r\n' +
        'a=rtcp-fb:108 ccm fir\r\n' +
        'a=rtcp-fb:108 nack\r\n' +
        'a=rtcp-fb:108 nack pli\r\n' +
        'a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\n' +
        'a=rtpmap:109 rtx/90000\r\n' +
        'a=fmtp:109 apt=108\r\n' +
        'a=rtpmap:124 H264/90000\r\n' +
        'a=rtcp-fb:124 goog-remb\r\n' +
        'a=rtcp-fb:124 transport-cc\r\n' +
        'a=rtcp-fb:124 ccm fir\r\n' +
        'a=rtcp-fb:124 nack\r\n' +
        'a=rtcp-fb:124 nack pli\r\n' +
        'a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\n' +
        'a=rtpmap:120 rtx/90000\r\n' +
        'a=fmtp:120 apt=124\r\n' +
        'a=rtpmap:123 H264/90000\r\n' +
        'a=rtcp-fb:123 goog-remb\r\n' +
        'a=rtcp-fb:123 transport-cc\r\n' +
        'a=rtcp-fb:123 ccm fir\r\n' +
        'a=rtcp-fb:123 nack\r\n' +
        'a=rtcp-fb:123 nack pli\r\n' +
        'a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f\r\n' +
        'a=rtpmap:119 rtx/90000\r\n' +
        'a=fmtp:119 apt=123\r\n' +
        'a=rtpmap:35 H264/90000\r\n' +
        'a=rtcp-fb:35 goog-remb\r\n' +
        'a=rtcp-fb:35 transport-cc\r\n' +
        'a=rtcp-fb:35 ccm fir\r\n' +
        'a=rtcp-fb:35 nack\r\n' +
        'a=rtcp-fb:35 nack pli\r\n' +
        'a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f\r\n' +
        'a=rtpmap:36 rtx/90000\r\n' +
        'a=fmtp:36 apt=35\r\n' +
        'a=rtpmap:41 AV1/90000\r\n' +
        'a=rtcp-fb:41 goog-remb\r\n' +
        'a=rtcp-fb:41 transport-cc\r\n' +
        'a=rtcp-fb:41 ccm fir\r\n' +
        'a=rtcp-fb:41 nack\r\n' +
        'a=rtcp-fb:41 nack pli\r\n' +
        'a=rtpmap:42 rtx/90000\r\n' +
        'a=fmtp:42 apt=41\r\n' +
        'a=rtpmap:114 red/90000\r\n' +
        'a=rtpmap:115 rtx/90000\r\n' +
        'a=fmtp:115 apt=114\r\n' +
        'a=rtpmap:116 ulpfec/90000\r\n' +
        'a=ssrc-group:FID 746033012 2865150791\r\n' +
        'a=ssrc:746033012 cname:+GjZY9VzWLB5PdLx\r\n' +
        'a=ssrc:746033012 msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=ssrc:746033012 mslabel:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'a=ssrc:746033012 label:f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=ssrc:2865150791 cname:+GjZY9VzWLB5PdLx\r\n' +
        'a=ssrc:2865150791 msid:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'a=ssrc:2865150791 mslabel:vq5hUoglKuoAhIxwfjpYHUIzyz8euz6Hij7r\r\n' +
        'a=ssrc:2865150791 label:f52a44ba-bc1c-46f5-9bb5-c073ae78c843\r\n' +
        'm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=candidate:1013599958 1 udp 2122260223 192.168.167.226 50093 typ host generation 0 network-id 1 network-cost 10\n' +
        'a=candidate:1927918118 1 tcp 1518280447 192.168.167.226 9 typ host tcptype active generation 0 network-id 1\n' +
        'a=ice-ufrag:1APu\r\n' +
        'a=ice-pwd:ZASYtA+D6s7vaTTr7gLLioMr\r\n' +
        'a=ice-options:trickle\r\n' +
        'a=fingerprint:sha-256 89:04:B1:13:EA:FB:30:21:D3:43:7F:7B:CF:B0:CD:46:BF:F0:19:8F:57:96:0E:E6:FC:76:AA:FB:2D:0E:4F:D3\r\n' +
        'a=setup:actpass\r\n' +
        'a=mid:2\r\n' +
        'a=sctp-port:5000\r\n' +
        'a=max-message-size:262144\r\n'
});

const event = mock(Event);
const response = mock(Response);
let responseHeaders: Headers | undefined = undefined;
const whipProtocol = mock(WHIPProtocol);
const rtcPeerConnection = mock(RTCPeerConnection);
const rtcPeerConnectionNoTrickleICE = mock(RTCPeerConnection);
const mediaStream = mock(MediaStream);
const mediaStreamAudioTrack = mock(MediaStreamTrack);
const mediaStreamVideoTrack = mock(MediaStreamTrack);

let whipClient: WHIPClient | undefined = undefined;
let whipClientNoTrickleICE: WHIPClient | undefined = undefined;

describe('WHIP Client', () => {
    beforeEach(() => {
        whipClient = new WHIPClient({
            endpoint: 'http://localhost/',
            opts: { debug: true },
            whipProtocol: instance(whipProtocol),
            peerConnectionFactory: (configuration: RTCConfiguration) => instance(rtcPeerConnection)
        });
        whipClientNoTrickleICE = new WHIPClient({
            endpoint: 'http://localhost/',
            opts: { debug: true, noTrickleIce: true },
            whipProtocol: instance(whipProtocol),
            peerConnectionFactory: (configuration: RTCConfiguration) => instance(rtcPeerConnectionNoTrickleICE)
        });

        when(mediaStream.getTracks())
            .thenReturn([
                instance(mediaStreamAudioTrack),
                instance(mediaStreamVideoTrack)
            ]);

        when(rtcPeerConnection.createOffer(anything()))
            .thenResolve(dummySdpOffer);

        when(rtcPeerConnection.localDescription)
            .thenReturn(dummySdpOffer);

        when(whipProtocol.sendOffer(anything(), anything(), anything()))
            .thenResolve(instance(response));

        when(whipProtocol.getConfiguration(anything(), anything()))
            .thenResolve(instance(response));

        when(response.ok)
            .thenReturn(true);

        responseHeaders = new Headers();
        responseHeaders.append("Location", "http://localhost/resource/");
        responseHeaders.append("Link", "");
        responseHeaders.append("Access-Control-Allow-Methods", "POST, DELETE, PATCH");

        when(response.headers)
            .thenReturn(responseHeaders);

        when(rtcPeerConnectionNoTrickleICE.createOffer(anything()))
            .thenResolve(dummySdpOffer);

        when(rtcPeerConnectionNoTrickleICE.localDescription)
            .thenReturn(dummySdpOfferWithCandidates);
    })

    afterEach(() => {
        reset(whipProtocol);
        reset(response);
        reset(rtcPeerConnection);
        reset(event);
        reset(mediaStream);
        reset(mediaStreamAudioTrack);
        reset(mediaStreamVideoTrack);
        reset(rtcPeerConnectionNoTrickleICE);
    })

    it('Registers ICE candidate callback when created', () => {
        verify(rtcPeerConnection.addEventListener(strictEqual('icecandidate'), anything()))
            .once();
    });

    it('Starts SDP negotiation when ingest is called', async () => {
        await whipClient.ingest(instance(mediaStream));

        verify(whipProtocol.sendOffer(anything(), anything(), anything()))
            .once();
    });

    it('Sends offer when all candidates are gathered if noTrickleICE is forced', async () => {
        await whipClientNoTrickleICE.ingest(instance(mediaStream));

        when(rtcPeerConnectionNoTrickleICE.iceGatheringState)
            .thenReturn('complete');

        await whipClientNoTrickleICE.onIceGatheringStateChange(instance(event));

        verify(whipProtocol.sendOffer(anything(), anything(), anything()))
            .once();
    });

    it('Does not close peer connection when connection state transitions to disconnected', async () => {
        when(whipProtocol.delete(anyString()))
            .thenResolve(instance(response));

        when(rtcPeerConnection.connectionState)
            .thenReturn('disconnected');

        await whipClient.ingest(instance(mediaStream));
        await whipClient.onConnectionStateChange(instance(event));

        verify(rtcPeerConnection.close())
            .never();
    })

    it('Closes peer connection when connection state transitions to failed', async () => {
        when(whipProtocol.delete(anyString()))
            .thenResolve(instance(response));

        when(rtcPeerConnection.connectionState)
            .thenReturn('failed');

        await whipClient.ingest(instance(mediaStream));
        await whipClient.onConnectionStateChange(instance(event));

        verify(rtcPeerConnection.close())
            .once();
    })

    it('Calling getConnectedState on whipClient returns connectionState attribute once', async () => {
        when(rtcPeerConnection.iceConnectionState)
            .thenReturn('connected');

        whipClient.getICEConnectionState();
        whipClientNoTrickleICE.getICEConnectionState();

        verify(rtcPeerConnection.iceConnectionState).once();
        verify(rtcPeerConnectionNoTrickleICE.iceConnectionState).once();
    });

})
