import { WhppOfferResponse, WhppAnswerRequest, WhppCandidateRequest } from "./whppRequests";

export interface WhppViewer {
  getId(): string;
  handlePost(stream?: MediaStream): Promise<WhppOfferResponse>;
  handlePut(request: WhppAnswerRequest): Promise<void>;
  handlePatch(request: WhppCandidateRequest): Promise<void>;
  destroy(): void;
  supportIceTrickle(): boolean;
}
