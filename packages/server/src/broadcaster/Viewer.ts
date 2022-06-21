import { ViewerOfferResponse, ViewerAnswerRequest, ViewerCandidateRequest } from "./ViewerRequests";

export interface Viewer {
    getId(): string;
    handlePost(stream?: MediaStream): Promise<ViewerOfferResponse>;
    handlePut(request: ViewerAnswerRequest): Promise<void>;
    handlePatch(request: ViewerCandidateRequest): Promise<void>;
    destroy(): void;
}
