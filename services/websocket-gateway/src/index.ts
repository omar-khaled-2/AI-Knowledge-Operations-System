import { loadConfig } from './config';
import { WebSocketServer } from './server';

const config = loadConfig();
const server = new WebSocketServer(config);

server.start();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});
