
export interface MediaStreamsInfoSsrc {
  ssrc: string;
  cname?: string;
  mslabel?: string;
  label?: string;
}

export interface MediaStreamsInfoSsrcGroup {
  semantics: string;
  ssrcs: string[];
}

export interface MediaStreamsInfo {
  audio: {
    ssrcs: MediaStreamsInfoSsrc[];
  },
  video: {
    ssrcs: MediaStreamsInfoSsrc[];
    ssrcGroups: MediaStreamsInfoSsrcGroup[];
    codec?: string;
  }
}
