export interface ViewerAnswerRequest {
    answer: string;
}

export interface ViewerCandidateRequest {
    candidate: string;
}

export interface ViewerMediaStream {
    streamId: string;
}

export interface ViewerOfferResponse {
    offer: string;
    mediaStreams: ViewerMediaStream[];
}
