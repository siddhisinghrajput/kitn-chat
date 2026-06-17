import { Worker } from 'bullmq';
import { queueConnection } from '../../config/bull';
import { prisma } from '../../config/db';
import { anthropic } from '../../config/anthropic';
import { AI_PROMPTS } from '../../modules/ai/ai.prompts';
import { getIo } from '../../socket/io';
import { logger } from '../../utils/logger';

export const aiSmartReplyWorker = new Worker(
  'ai_smart_reply',
  async (job) => {
    const { messageId, roomId } = job.data;
    logger.info(`🤖 Running Smart Reply worker for room ${roomId} after message ${messageId}`);

    try {
      // Fetch the last 5 messages in the room (sent only)
      const messages = await prisma.message.findMany({
        where: {
          roomId,
          isSent: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { username: true },
          },
        },
      });

      if (messages.length === 0) {
        return;
      }

      // Reverse to get chronological sequence
      const chronological = messages.reverse();
      
      const contextText = chronological
        .map((m) => `${m.sender.username}: ${m.content}`)
        .join('\n');

      const prompt = AI_PROMPTS.smartReplies(contextText);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(cleanedText);
      } catch (err) {
        logger.error(`❌ Failed to parse smart replies JSON: ${cleanedText}`);
        return;
      }

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const io = getIo();
        // Emit smart reply options to all room members
        io.to(`room:${roomId}`).emit('smart_replies_ready', {
          messageId,
          suggestions,
        });
      }
    } catch (err: any) {
      logger.error(`❌ AI Smart Reply worker failed: ${err.message}`);
      throw err;
    }
  },
  { connection: queueConnection }
);
