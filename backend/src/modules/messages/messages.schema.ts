import { z } from 'zod';

export const scheduleMessageSchema = z.object({
  roomId: z.number(),
  content: z.string().min(1, 'Message content cannot be empty'),
  scheduledAt: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime string' }),
});
