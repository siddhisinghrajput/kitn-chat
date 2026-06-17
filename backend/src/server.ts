import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocketServer } from './socket';
import { initQueueWorkers } from './queue';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketServer(server);

// Initialize background BullMQ workers
initQueueWorkers();

server.listen(env.PORT, () => {
  logger.info(`🚀 Kith Backend running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
});
