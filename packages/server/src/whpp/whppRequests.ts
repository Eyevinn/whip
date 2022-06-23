export interface WhppAnswerRequest {
  answer: string;
}

export interface WhppCandidateRequest {
  candidate: string;
}

export interface WhppMediaStream {
  streamId: string;
}

export interface WhppOfferResponse {
  offer: string;
  mediaStreams: WhppMediaStream[];
}
