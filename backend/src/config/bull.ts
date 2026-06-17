import { ConnectionOptions } from 'bullmq';
import { env } from './env';

export const queueConnection: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};
