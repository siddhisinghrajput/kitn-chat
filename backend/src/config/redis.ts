import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// ioredis client singleton
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
});

redis.on('connect', () => {
  logger.info('🔌 Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error(err, '❌ Redis connection error');
});
