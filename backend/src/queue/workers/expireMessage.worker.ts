import { Worker } from 'bullmq';
import { queueConnection } from '../../config/bull';
import { MessagesService } from '../../modules/messages/messages.service';
import { getIo } from '../../socket/io';
import { logger } from '../../utils/logger';

export const expireMessageWorker = new Worker(
  'expire_message',
  async (job) => {
    const { messageId, roomId } = job.data;
    logger.info(`🧹 Expiring disappearing message: ${messageId} in room: ${roomId}`);
    
    try {
      await MessagesService.expireMessage(messageId);
      
      const io = getIo();
      io.to(`room:${roomId}`).emit('message_expired', { messageId });
    } catch (err: any) {
      logger.error(`❌ Failed to expire message ${messageId}: ${err.message}`);
      throw err;
    }
  },
  { connection: queueConnection }
);
