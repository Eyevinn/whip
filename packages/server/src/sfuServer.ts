import { BroadcasterClient, WhipEndpoint } from './index';

if (!process.env.SMB_URL) {
  throw new Error('SMB_URL environment variable is required');
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

const server = new WhipEndpoint({
  port: PORT,
  enabledWrtcPlugins: ['sfu-broadcaster']
});
const sfuUrl = new URL('/conferences/', process.env.SMB_URL);
server.setOriginSfuUrl(sfuUrl.toString());
if (process.env.SMB_API_KEY) {
  server.setSfuApiKey(process.env.SMB_API_KEY);
}
if (process.env.WHEP_ENDPOINT_URL) {
  const whepChannelApiUrl = new URL('/api', process.env.WHEP_ENDPOINT_URL);
  const whepClient = new BroadcasterClient(whepChannelApiUrl.toString());
  server.registerBroadcasterClient({
    client: whepClient,
    sfuUrl: sfuUrl.toString()
  });
}

server.listen();
