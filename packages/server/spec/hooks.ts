/**
 * Mocha root hooks — loaded via --require in the test script.
 * Suppresses console.log output during tests so that verbose protocol
 * payloads (SDP offers, ICE candidates, etc.) do not pollute the terminal.
 */
export const mochaHooks = {
  beforeAll() {
    // Silence console.log for all tests. console.error is left intact so
    // genuine errors are still visible.
    (console as any)._originalLog = console.log;
    console.log = () => {};
  },

  afterAll() {
    // Restore console.log so any post-run reporting tools still work.
    if ((console as any)._originalLog) {
      console.log = (console as any)._originalLog;
    }
  },
};
