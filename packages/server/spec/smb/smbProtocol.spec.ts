import { expect } from 'chai';
import { SmbProtocol } from '../../src/smb/smbProtocol';
import { ISmbProtocol } from '../../src/smb/ISmbProtocol';

// Minimal fetch stub — replaced per test
let stubbedFetch: (url: string, opts?: unknown) => Promise<unknown>;
const originalFetch = (global as any).fetch;

before(() => {
  (global as any).fetch = (url: string, opts?: unknown) => stubbedFetch(url, opts);
});

after(() => {
  (global as any).fetch = originalFetch;
});

describe('SmbProtocol', () => {
  let protocol: SmbProtocol;

  beforeEach(() => {
    protocol = new SmbProtocol('test-api-key');
  });

  // Fix 1: allocateConference must NOT log to console before throwing
  describe('allocateConference', () => {
    it('throws without calling console.log when SMB returns a non-OK status', async () => {
      const logged: unknown[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => { logged.push(args); };

      stubbedFetch = async () => ({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({})
      });

      try {
        await protocol.allocateConference('http://smb/conferences/');
        expect.fail('Expected error to be thrown');
      } catch (err) {
        expect((err as Error).message).to.include('400');
      } finally {
        console.log = originalLog;
      }

      expect(logged).to.have.length(0);
    });
  });

  // Fix 2: getEndpoints must throw (not return []) on non-OK status
  describe('getEndpoints', () => {
    it('throws when SMB returns a non-OK status', async () => {
      stubbedFetch = async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      });

      // withRetry will retry transient errors; since the error message contains '500'
      // we need to exhaust retries — use a fast clock stub or just verify it rejects
      let threw = false;
      const start = Date.now();
      try {
        // Override delays to zero for this test by triggering a non-transient error
        stubbedFetch = async () => ({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({})
        });
        await protocol.getEndpoints('http://smb/conferences/', 'conf1');
      } catch (err) {
        threw = true;
        expect((err as Error).message).to.include('404');
      }
      expect(threw).to.equal(true);
    });

    it('returns endpoint array on success', async () => {
      const endpoints = [{ id: 'ingest', iceState: 'CONNECTED' }];
      stubbedFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => endpoints
      });

      const result = await protocol.getEndpoints('http://smb/conferences/', 'conf1');
      expect(result).to.deep.equal(endpoints);
    });
  });

  // Fix 2: deleteEndpoint must throw (not return false) on non-OK status
  describe('deleteEndpoint', () => {
    it('throws when SMB returns a non-OK status', async () => {
      stubbedFetch = async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({})
      });

      let threw = false;
      try {
        await protocol.deleteEndpoint('http://smb/conferences/', 'conf1', 'ep1');
      } catch (err) {
        threw = true;
        expect((err as Error).message).to.include('404');
      }
      expect(threw).to.equal(true);
    });

    it('returns true on success', async () => {
      stubbedFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      const result = await protocol.deleteEndpoint('http://smb/conferences/', 'conf1', 'ep1');
      expect(result).to.equal(true);
    });
  });

  // Fix 4: SmbProtocol implements ISmbProtocol — verify structural conformance
  describe('ISmbProtocol interface conformance', () => {
    it('SmbProtocol instance is assignable to ISmbProtocol', () => {
      // TypeScript compile-time check: this assignment would fail if SmbProtocol
      // did not implement ISmbProtocol
      const p: ISmbProtocol = protocol;
      expect(p).to.equal(protocol);
    });

    it('has all required ISmbProtocol methods', () => {
      const requiredMethods: Array<keyof ISmbProtocol> = [
        'allocateConference',
        'allocateEndpoint',
        'configureEndpoint',
        'getConferences',
        'getEndpoints',
        'deleteEndpoint'
      ];
      for (const method of requiredMethods) {
        expect(typeof (protocol as ISmbProtocol)[method]).to.equal('function');
      }
    });
  });
});
