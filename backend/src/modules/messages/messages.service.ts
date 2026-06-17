import { prisma } from '../../config/db';
import { scheduleMessageQueue } from '../../queue/queues';
import { getPaginationParams, formatPaginatedResult } from '../../utils/pagination';

export class MessagesService {
  /**
   * Fetch paginated messages in a room
   */
  static async listMessages(roomId: number, cursor?: string, limit: number = 50, requesterUserId?: number) {
    const { take, cursor: cursorArg, skip } = getPaginationParams(cursor, limit);

    // Fetch messages from DB (only sent messages)
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        isSent: true,
      },
      take,
      skip,
      cursor: cursorArg,
      orderBy: { createdAt: 'desc' },
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

    // Check if requester is room admin to reveal true identity for anonymous messages
    let isRequesterAdmin = false;
    if (requesterUserId) {
      const membership = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: requesterUserId } },
      });
      isRequesterAdmin = membership?.role === 'admin';
    }

    // Map messages, masking anonymous sender details for non-admins
    const formattedMessages = messages.map((m) => {
      if (m.isAnonymous && !isRequesterAdmin) {
        return {
          ...m,
          sender: {
            id: null,
            username: m.sender.anonymousAlias || 'Anonymous',
            avatarUrl: null,
            isAnonymousMode: true,
            anonymousAlias: m.sender.anonymousAlias,
          },
        };
      }
      return m;
    });

    return formatPaginatedResult(formattedMessages, limit);
  }

  /**
   * Schedule a message for future delivery via BullMQ
   */
  static async scheduleMessage(senderId: number, roomId: number, content: string, scheduledAt: Date) {
    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Save message with isSent=false in DB
    const message = await prisma.message.create({
      data: {
        roomId,
        senderId,
        content,
        type: 'text',
        isSent: false,
        scheduledAt,
      },
    });

    // Add delayed job to scheduleMessageQueue with jobId = message.id
    await scheduleMessageQueue.add(
      'send_scheduled',
      { messageId: message.id },
      { delay, jobId: message.id }
    );

    return message;
  }

  /**
   * Cancel a scheduled message
   */
  static async cancelScheduledMessage(messageId: string, requesterUserId: number) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== requesterUserId) {
      throw new Error('Only the creator can cancel this scheduled message');
    }

    if (message.isSent) {
      throw new Error('Cannot cancel a message that has already been sent');
    }

    // Remove job from BullMQ
    const job = await scheduleMessageQueue.getJob(messageId);
    if (job) {
      await job.remove();
    }

    // Delete message from DB
    await prisma.message.delete({
      where: { id: messageId },
    });

    return true;
  }

  /**
   * Expire (soft-delete) a disappearing message
   */
  static async expireMessage(messageId: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
        voiceUrl: null,
        voiceDurationSeconds: null,
      },
    });
  }
}
