import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { apiRateLimiter } from './middleware/rateLimiter';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import messagesRoutes from './modules/messages/messages.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import pollsRoutes from './modules/polls/polls.routes';
import locationRoutes from './modules/location/location.routes';
import voiceRoutes from './modules/voice/voice.routes';
import translationRoutes from './modules/translation/translation.routes';
import aiRoutes from './modules/ai/ai.routes';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global rate limiter
  app.use(apiRateLimiter);

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api', messagesRoutes);       // GET /rooms/:id/messages, POST /messages/:id/pin, schedule etc.
  app.use('/api', tasksRoutes);          // GET /rooms/:id/tasks, PUT /tasks/:id/complete
  app.use('/api', pollsRoutes);          // POST /rooms/:id/polls, POST /polls/:id/vote, GET /polls/:id
  app.use('/api/location', locationRoutes);
  app.use('/api/messages/voice', voiceRoutes);
  app.use('/api/messages', translationRoutes); // POST /messages/:id/translate
  app.use('/api', aiRoutes);             // POST /ai/tone-check, POST /rooms/:id/summarize

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', time: new Date() });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    logger.error(`❌ Request Error: ${message} (Status: ${status})`);
    
    res.status(status).json({
      error: message,
    });
  });

  return app;
}
