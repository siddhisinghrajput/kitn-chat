import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { aiSummaryQueue } from '../../queue/queues';
import { logger } from '../../utils/logger';
import { getIo } from '../../socket/io';

export class SummarizerService {
  /**
   * Request conversation summary - checks Redis cache first, else schedules a BullMQ job
   */
  static async requestSummary(
    userId: number,
    roomId: number,
    sinceMessageId?: string,
    sinceTimestamp?: string
  ) {
    const cacheKey = `summary:${roomId}:${sinceMessageId || 'none'}:${sinceTimestamp || 'none'}`;

    // 1. Check Redis Cache (5 minutes TTL)
    const cachedSummary = await redis.get(cacheKey);
    if (cachedSummary) {
      logger.info(`💎 AI Summary cache hit for room ${roomId}`);
      // Push via socket
      const io = getIo();
      io.to(`user:${userId}`).emit('ai_summary_ready', { roomId, summary: cachedSummary });
      return { status: 'cached', summary: cachedSummary };
    }

    // 2. Fetch history messages
    const where: any = {
      roomId,
      isSent: true,
    };

    if (sinceMessageId) {
      const msg = await prisma.message.findUnique({ where: { id: sinceMessageId } });
      if (msg) {
        where.createdAt = { gt: msg.createdAt };
      }
    } else if (sinceTimestamp) {
      where.createdAt = { gt: new Date(sinceTimestamp) };
    }

    const messages = await prisma.message.findMany({
      where,
      take: 100, // Max 100 messages
      orderBy: { createdAt: 'asc' }, // In chronological order for summary context
      include: {
        sender: {
          select: { username: true },
        },
      },
    });

    if (messages.length === 0) {
      return { status: 'empty', message: 'No messages to summarize' };
    }

    // Format chat logs text transcript
    const messagesText = messages
      .map((m) => `${m.sender.username}: ${m.content}`)
      .join('\n');

    // 3. Enqueue summarizer worker job
    await aiSummaryQueue.add('ai_summary', {
      roomId,
      messagesText,
      cacheKey,
      userId,
    });

    return { status: 'enqueued', message: 'Summarization job enqueued. You will receive notification shortly.' };
  }
}
