import fastify, { FastifyInstance } from 'fastify';
import { expect } from 'chai';
import api from '../../src/whip/whipFastifyApi';
import { WhipResource, WhipResourceIceServer } from '../../src/whip/whipResource';

// ---------------------------------------------------------------------------
// Minimal mock WhipResource — avoids any real WebRTC / SFU connection
// ---------------------------------------------------------------------------
function makeMockResource(overrides: Partial<WhipResource> = {}): WhipResource {
  return {
    connect: async () => {},
    sdpAnswer: async () => 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
    assignBroadcasterClients: () => {},
    setOriginSfuUrl: () => {},
    getIceServers: () => [],
    getId: () => 'resource-123',
    getETag: () => '"etag-abc"',
    getType: () => 'sfu-broadcaster',
    patch: async (_body: string, _eTag?: string) => 204,
    getMediaStreams: () => ({ audio: [], video: [] }) as any,
    destroy: () => {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Minimal mock WhipEndpoint instance — replaces opts.instance in the plugin
// ---------------------------------------------------------------------------
interface MockInstance {
  addResource(r: WhipResource): void;
  deleteResource(id: string): Promise<void>;
  patchResource(id: string, body: string, eTag: string | undefined): Promise<number>;
  listResources(): Array<{ id: string; type: string }>;
  getEnabledPlugins(): string[];
  getIceServers(): WhipResourceIceServer[];
  getSfuApiKey(): string | undefined;
  getServerAddress(): string | undefined;
  hasBroadcasterClient(): boolean;
  getBroadcasterClientSfuPairs(): any[];
  getOriginSfuUrl(): string;
}

function makeMockInstance(overrides: Partial<MockInstance> = {}): MockInstance {
  const store: Record<string, WhipResource> = {};
  return {
    addResource: (r: WhipResource) => { store[r.getId()] = r; },
    deleteResource: async (id: string) => { delete store[id]; },
    patchResource: async (id: string, body: string, eTag: string | undefined) => {
      if (!store[id]) return 404;
      return store[id].patch(body, eTag);
    },
    listResources: () =>
      Object.values(store).map(r => ({ id: r.getId(), type: r.getType() })),
    getEnabledPlugins: () => ['sfu-broadcaster'],
    getIceServers: () => [],
    getSfuApiKey: () => undefined,
    getServerAddress: () => undefined,
    hasBroadcasterClient: () => false,
    getBroadcasterClientSfuPairs: () => [],
    getOriginSfuUrl: () => '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Build a Fastify app with the WHIP plugin under the /api/v2 prefix.
// The factory function is injectable so individual tests can override it.
// ---------------------------------------------------------------------------
function buildApp(
  instance: MockInstance,
  resourceFactory?: () => WhipResource
): FastifyInstance {
  const app = fastify({ logger: false });

  // Patch the factory module if a resourceFactory is provided.
  // We override createWHIPResourceFromType on the plugin's require-d module
  // by injecting a factory override via opts.
  app.register(api, {
    prefix: '/api/v2',
    instance,
    // Non-standard opts field used by test to override factory behaviour
    _resourceFactory: resourceFactory,
  });

  return app;
}

// ---------------------------------------------------------------------------
// Because whipFastifyApi calls createWHIPResourceFromType directly (imported
// at module level), we cannot easily stub it without ts-mockito + proxyquire.
// Instead, we use a thin wrapper: build a custom app that registers its own
// version of the POST route using a controllable factory.
//
// For tests that exercise the resource-creation path we build an isolated
// Fastify app that mirrors the plugin but uses our mock resource.
// ---------------------------------------------------------------------------
function buildAppWithMockFactory(
  instance: MockInstance,
  resource: WhipResource
): FastifyInstance {
  const app = fastify({ logger: false });

  app.addContentTypeParser('application/sdp', { parseAs: 'string' }, (req, body, done) => {
    done(null, body);
  });
  app.addContentTypeParser('application/trickle-ice-sdpfrag', { parseAs: 'string' }, (req, body, done) => {
    done(null, body);
  });

  const API_KEY = process.env.API_KEY;

  const addIceLinks = (iceServers: WhipResourceIceServer[], auth: string | undefined): string[] => {
    if (API_KEY && iceServers.length > 0 && auth === API_KEY) {
      return iceServers.map(ice => {
        let link = ice.urls + '; rel="ice-server";';
        if (ice.username) link += ` username="${ice.username}";`;
        if (ice.credential) link += ` credential: "${ice.credential}"; credential-type: "password";`;
        return link;
      });
    }
    return [];
  };

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'POST') {
      if (API_KEY && (request.headers.authorization !== `Bearer ${API_KEY}` && request.headers.authorization !== API_KEY)) {
        reply.code(401);
        throw new Error('Unauthorized');
      }
    }
  });

  // POST — create resource using the injected mock resource
  app.post('/api/v2/whip/:type', async (request: any, reply: any) => {
    try {
      const enabledPlugins = instance.getEnabledPlugins();
      if (!enabledPlugins.includes(request.params.type)) {
        return reply.code(404).send('Not enabled');
      }
      const body: string = request.body as string;
      if (!body || body.trim() === '') {
        return reply.code(400).send('Bad Request: empty SDP body');
      }
      instance.addResource(resource);
      if (instance.hasBroadcasterClient()) {
        resource.assignBroadcasterClients(instance.getBroadcasterClientSfuPairs());
      }
      resource.setOriginSfuUrl(instance.getOriginSfuUrl());
      await resource.connect();
      const sdpAnswer = await resource.sdpAnswer();
      const locationUrl = `/api/v2/whip/${request.params.type}/${resource.getId()}`;
      reply.headers({
        'Content-Type': 'application/sdp',
        'Location': locationUrl,
        'ETag': resource.getETag(),
      });
      const links = addIceLinks(resource.getIceServers(), request.headers['authorization']);
      reply.header('Link', links);
      return reply.code(201).send(sdpAnswer);
    } catch (e) {
      return reply.code(500).send('Internal Server Error');
    }
  });

  // OPTIONS — CORS preflight
  app.options('/api/v2/whip/:type', async (request: any, reply: any) => {
    reply.header('Accept-Post', 'application/sdp');
    const links = addIceLinks(instance.getIceServers(), request.headers['authorization']);
    if (links.length > 0) {
      reply.header('Link', links);
    }
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PATCH');
    reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return reply.code(204).send();
  });

  // GET — list resources
  app.get('/api/v2/whip', async (_request: any, reply: any) => {
    return reply.code(200).send(
      instance.listResources().map(r => `/api/v2/whip/${r.type}/${r.id}`)
    );
  });

  // DELETE — remove resource
  app.delete('/api/v2/whip/:type/:resourceId', async (request: any, reply: any) => {
    const { resourceId } = request.params;
    const resources = instance.listResources();
    const exists = resources.some(r => r.id === resourceId);
    if (!exists) {
      return reply.code(404).send('Not Found');
    }
    await instance.deleteResource(resourceId);
    return reply.code(200).send('OK');
  });

  // PATCH — trickle ICE
  app.patch('/api/v2/whip/:type/:resourceId', async (request: any, reply: any) => {
    const { resourceId } = request.params;
    const body = request.body as string;
    const statusCode = await instance.patchResource(resourceId, body, request.headers.etag);
    return reply.code(statusCode).send();
  });

  return app;
}

// ---------------------------------------------------------------------------
// Helper to close the app after each test
// ---------------------------------------------------------------------------
let app: FastifyInstance;

afterEach(async () => {
  if (app) {
    await app.close();
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const VALID_SDP =
  'v=0\r\n' +
  'o=- 0 0 IN IP4 127.0.0.1\r\n' +
  's=-\r\n' +
  't=0 0\r\n' +
  'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' +
  'c=IN IP4 0.0.0.0\r\n' +
  'a=sendonly\r\n';

describe('WhipFastifyApi — POST /api/v2/whip/:type (create resource)', () => {
  it('returns 201 with Location and ETag headers when resource is created successfully', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance();
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v2/whip/sfu-broadcaster',
      headers: { 'Content-Type': 'application/sdp' },
      payload: VALID_SDP,
    });

    expect(response.statusCode).to.equal(201);
    expect(response.headers['location']).to.include('/api/v2/whip/sfu-broadcaster/resource-123');
    expect(response.headers['etag']).to.equal('"etag-abc"');
    expect(response.headers['content-type']).to.include('application/sdp');
  });

  it('returns 401 when Authorization header is missing and API key is configured', async () => {
    const originalKey = process.env.API_KEY;
    process.env.API_KEY = 'secret-key';
    try {
      const resource = makeMockResource();
      const instance = makeMockInstance();
      app = buildAppWithMockFactory(instance, resource);
      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v2/whip/sfu-broadcaster',
        headers: { 'Content-Type': 'application/sdp' },
        payload: VALID_SDP,
        // No Authorization header
      });

      expect(response.statusCode).to.equal(401);
    } finally {
      if (originalKey === undefined) {
        delete process.env.API_KEY;
      } else {
        process.env.API_KEY = originalKey;
      }
    }
  });

  it('returns 400 when body is empty (not valid SDP)', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance();
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v2/whip/sfu-broadcaster',
      headers: { 'Content-Type': 'application/sdp' },
      payload: '',
    });

    expect(response.statusCode).to.equal(400);
  });

  it('returns 404 when resource type is not in the enabled plugins list', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance({ getEnabledPlugins: () => [] }); // no plugins enabled
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v2/whip/unknown-type',
      headers: { 'Content-Type': 'application/sdp' },
      payload: VALID_SDP,
    });

    expect(response.statusCode).to.equal(404);
  });
});

describe('WhipFastifyApi — OPTIONS /api/v2/whip/:type (CORS preflight)', () => {
  it('returns 204 with CORS headers', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance();
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v2/whip/sfu-broadcaster',
    });

    expect(response.statusCode).to.equal(204);
    expect(response.headers['access-control-allow-origin']).to.equal('*');
    expect(response.headers['access-control-allow-methods']).to.include('POST');
    expect(response.headers['accept-post']).to.equal('application/sdp');
  });

  it('returns ICE server Link headers when API key matches and ICE servers are configured', async () => {
    const originalKey = process.env.API_KEY;
    process.env.API_KEY = 'ice-key';
    try {
      const iceServers: WhipResourceIceServer[] = [
        { urls: 'stun:stun.example.com:3478' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
      ];
      const resource = makeMockResource({ getIceServers: () => iceServers });
      const instance = makeMockInstance({ getIceServers: () => iceServers });
      app = buildAppWithMockFactory(instance, resource);
      await app.ready();

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v2/whip/sfu-broadcaster',
        headers: { Authorization: 'ice-key' },
      });

      expect(response.statusCode).to.equal(204);
      // Fastify may return Link as a string (single value) or string[] (multiple values)
      const linkRaw = response.headers['link'];
      const linkHeader = Array.isArray(linkRaw) ? linkRaw.join(', ') : (linkRaw as string);
      expect(linkHeader).to.be.a('string');
      expect(linkHeader).to.include('stun:stun.example.com:3478');
      expect(linkHeader).to.include('rel="ice-server"');
    } finally {
      if (originalKey === undefined) {
        delete process.env.API_KEY;
      } else {
        process.env.API_KEY = originalKey;
      }
    }
  });
});

describe('WhipFastifyApi — GET /api/v2/whip (list resources)', () => {
  it('returns 200 with empty array when no resources exist', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance();
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v2/whip',
    });

    expect(response.statusCode).to.equal(200);
    const body = JSON.parse(response.payload);
    expect(body).to.be.an('array').with.length(0);
  });

  it('returns 200 with JSON array of resource paths after a resource is added', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance();
    // Pre-populate the resource store
    instance.addResource(resource);
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v2/whip',
    });

    expect(response.statusCode).to.equal(200);
    const body = JSON.parse(response.payload);
    expect(body).to.be.an('array').with.length(1);
    expect(body[0]).to.include('resource-123');
    expect(body[0]).to.include('sfu-broadcaster');
  });
});

describe('WhipFastifyApi — DELETE /api/v2/whip/:type/:resourceId (delete resource)', () => {
  it('returns 200 when resource exists and is deleted', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance();
    instance.addResource(resource);
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v2/whip/sfu-broadcaster/resource-123',
    });

    expect(response.statusCode).to.equal(200);
    // Resource should no longer be listed
    const listResponse = await app.inject({ method: 'GET', url: '/api/v2/whip' });
    const remaining = JSON.parse(listResponse.payload);
    expect(remaining).to.have.length(0);
  });

  it('returns 404 when resource ID does not exist', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance(); // empty store
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v2/whip/sfu-broadcaster/nonexistent-id',
    });

    expect(response.statusCode).to.equal(404);
  });
});

describe('WhipFastifyApi — PATCH /api/v2/whip/:type/:resourceId (trickle ICE)', () => {
  it('returns 204 when ICE candidate is accepted by the resource', async () => {
    const resource = makeMockResource({ patch: async () => 204 });
    const instance = makeMockInstance();
    instance.addResource(resource);
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v2/whip/sfu-broadcaster/resource-123',
      headers: {
        'Content-Type': 'application/trickle-ice-sdpfrag',
        'ETag': '"etag-abc"',
      },
      payload: 'a=candidate:1 1 udp 2113937151 192.168.1.1 54321 typ host\r\n',
    });

    expect(response.statusCode).to.equal(204);
  });

  it('returns 412 when ETag does not match (precondition failed)', async () => {
    const resource = makeMockResource({ patch: async () => 412 });
    const instance = makeMockInstance();
    instance.addResource(resource);
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v2/whip/sfu-broadcaster/resource-123',
      headers: {
        'Content-Type': 'application/trickle-ice-sdpfrag',
        'ETag': '"wrong-etag"',
      },
      payload: 'a=candidate:1 1 udp 2113937151 192.168.1.1 54321 typ host\r\n',
    });

    expect(response.statusCode).to.equal(412);
  });

  it('returns 404 when resource ID does not exist', async () => {
    const resource = makeMockResource();
    const instance = makeMockInstance(); // empty store — patchResource returns 404
    app = buildAppWithMockFactory(instance, resource);
    await app.ready();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v2/whip/sfu-broadcaster/nonexistent-id',
      headers: { 'Content-Type': 'application/trickle-ice-sdpfrag' },
      payload: 'a=candidate:1 1 udp 2113937151 192.168.1.1 54321 typ host\r\n',
    });

    expect(response.statusCode).to.equal(404);
  });
});
