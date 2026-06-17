import { Worker } from 'bullmq';
import { queueConnection } from '../../config/bull';
import { anthropic } from '../../config/anthropic';
import { redis } from '../../config/redis';
import { AI_PROMPTS } from '../../modules/ai/ai.prompts';
import { getIo } from '../../socket/io';
import { logger } from '../../utils/logger';

export const aiSummaryWorker = new Worker(
  'ai_summary',
  async (job) => {
    const { roomId, messagesText, cacheKey, userId } = job.data;
    logger.info(`🤖 Running AI Summary worker for room ${roomId} requested by user ${userId}`);

    try {
      const prompt = AI_PROMPTS.summarizer(messagesText);
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text : '';

      // Cache result in Redis for 5 minutes (300 seconds)
      await redis.setex(cacheKey, 300, summary);

      // Emit results via socket specifically to the requesting user's private channel
      const io = getIo();
      io.to(`user:${userId}`).emit('ai_summary_ready', { roomId, summary });
    } catch (err: any) {
      logger.error(`❌ AI Summary worker request failed: ${err.message}`);
      throw err;
    }
  },
  { connection: queueConnection }
);
