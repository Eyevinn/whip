import fetch from 'cross-fetch';

type Origin = string;
type Territory = string;

interface Edge {
  sfuApiUrl: string;
  egressApiUrl: string;
  whepEndpointBaseUrl: string;
}

type EdgeList = Edge[];

export type OriginsAndEdges = Record<Origin, EdgeList>;

export type OriginsAndEdgesPerTerritory = Record<Territory, OriginsAndEdges>;

export async function callResourceManager(resourceManagerUrl: string): Promise<OriginsAndEdgesPerTerritory> {
  const reply = await fetch(`${resourceManagerUrl}/api/v1/items-per-territory`);
  if (!reply.ok) {
    throw new Error(
      `Error ${reply.status} while calling endpoint /items-per-territory at resourceManager.`
    );
  }
  return (await reply.json()) as OriginsAndEdgesPerTerritory;
}
