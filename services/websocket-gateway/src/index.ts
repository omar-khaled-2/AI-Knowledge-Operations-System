import { loadConfig } from './config';
import { WebSocketServer } from './server';
import { logger } from './logger';

const config = loadConfig();
const server = new WebSocketServer(config);

server.start();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});
