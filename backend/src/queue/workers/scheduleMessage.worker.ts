import { Worker } from 'bullmq';
import { queueConnection } from '../../config/bull';
import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';
import { logger } from '../../utils/logger';
import { expireMessageQueue } from '../queues';

export const scheduleMessageWorker = new Worker(
  'send_scheduled',
  async (job) => {
    const { messageId } = job.data;
    logger.info(`✉️ Delivering scheduled message: ${messageId}`);

    try {
      // Set message as sent
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { isSent: true },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              isAnonymousMode: true,
              anonymousAlias: true,
            },
          },
        },
      });

      // Prepare client socket payload mapping anonymous statuses
      const socketPayload = {
        id: message.id,
        roomId: message.roomId,
        content: message.content,
        type: message.type,
        isAnonymous: message.isAnonymous,
        createdAt: message.createdAt,
        sender: {
          id: message.isAnonymous ? null : message.sender.id,
          username: message.isAnonymous ? message.sender.anonymousAlias || 'Anonymous' : message.sender.username,
          avatarUrl: message.isAnonymous ? null : message.sender.avatarUrl,
          isAnonymousMode: message.isAnonymous,
          anonymousAlias: message.sender.anonymousAlias,
        },
        _realSenderId: message.senderId,
      };

      // Broadcast message to room members
      const io = getIo();
      io.to(`room:${message.roomId}`).emit('new_message', socketPayload);

      // If scheduled message is also set to disappear
      if (message.expiresAt) {
        const delay = message.expiresAt.getTime() - Date.now();
        if (delay > 0) {
          await expireMessageQueue.add(
            'expire_message',
            { messageId: message.id, roomId: message.roomId },
            { delay, jobId: `exp:${message.id}` }
          );
        }
      }
    } catch (err: any) {
      logger.error(`❌ Failed to send scheduled message ${messageId}: ${err.message}`);
      throw err;
    }
  },
  { connection: queueConnection }
);
