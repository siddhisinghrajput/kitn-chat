import { Worker } from 'bullmq';
import { queueConnection } from '../../config/bull';
import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';
import { logger } from '../../utils/logger';

export const pollExpireWorker = new Worker(
  'poll_expire',
  async (job) => {
    const { pollId } = job.data;
    logger.info(`📊 Auto-closing poll: ${pollId}`);

    try {
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            select: {
              id: true,
              optionText: true,
              voteCount: true,
            },
          },
        },
      });

      if (!poll) {
        return;
      }

      // Broadcast final results to the room members
      const io = getIo();
      io.to(`room:${poll.roomId}`).emit('poll_updated', {
        pollId,
        options: poll.options,
        isClosed: true,
      });
    } catch (err: any) {
      logger.error(`❌ Poll expire worker failed: ${err.message}`);
      throw err;
    }
  },
  { connection: queueConnection }
);
