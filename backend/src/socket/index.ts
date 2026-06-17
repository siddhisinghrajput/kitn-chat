import { Server } from 'socket.io';
import http from 'http';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { setIo } from './io';
import { socketAuthMiddleware } from './auth.middleware';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerMessageHandlers } from './handlers/message.handler';
import { registerPollHandlers } from './handlers/poll.handler';
import { registerLocationHandlers } from './handlers/location.handler';
import { registerMoodHandlers } from './handlers/mood.handler';

/**
 * Initializes and starts the Socket.IO server instance on top of HTTP
 */
export function initSocketServer(server: http.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for dev simplicity
      methods: ['GET', 'POST'],
    },
  });

  // Setup Redis horizontal scaling adapter
  try {
    const pubClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('🔌 Socket.IO Redis adapter enabled successfully');
  } catch (err: any) {
    logger.error(`❌ Failed to initialize Socket.IO Redis adapter: ${err.message}`);
  }

  // Mount JWT auth middleware
  io.use(socketAuthMiddleware);

  // Connection listener
  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info(`🔌 Socket client connected: ${user.username} (ID: ${user.id}, Socket: ${socket.id})`);

    // Register all event sub-handlers
    registerRoomHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerPollHandlers(io, socket);
    registerLocationHandlers(io, socket);
    registerMoodHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket client disconnected: ${user.username} (Socket: ${socket.id})`);
    });
  });

  // Store the io instance globally
  setIo(io);

  return io;
}
