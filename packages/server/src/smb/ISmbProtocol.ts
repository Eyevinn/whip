import { SmbEndpoint, SmbEndpointDescription } from './smbProtocol';

export interface ISmbProtocol {
  allocateConference(smbUrl: string): Promise<string>;
  allocateEndpoint(
    smbUrl: string,
    conferenceId: string,
    endpointId: string,
    audio: boolean,
    video: boolean,
    data: boolean
  ): Promise<SmbEndpointDescription>;
  configureEndpoint(
    smbUrl: string,
    conferenceId: string,
    endpointId: string,
    endpointDescription: SmbEndpointDescription
  ): Promise<void>;
  getConferences(smbUrl: string): Promise<string[]>;
  getEndpoints(smbUrl: string, conferenceId: string): Promise<SmbEndpoint[]>;
  deleteEndpoint(smbUrl: string, conferenceId: string, endpointId: string): Promise<boolean>;
}
