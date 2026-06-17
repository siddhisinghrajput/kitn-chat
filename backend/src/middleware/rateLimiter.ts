import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

// Standard rate limiter: 100 requests per 15 minutes per IP
export const apiRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Stricter rate limiter for AI operations: 10 requests per minute per user (or IP)
export const aiRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by user ID if authenticated, fallback to IP address
    return req.user ? `ai-limit:${req.user.id}` : `ai-limit:${req.ip}`;
  },
  message: {
    error: 'AI operations rate limit exceeded. Limit is 10 requests per minute.',
  },
});
