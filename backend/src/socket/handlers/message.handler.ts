import { Server, Socket } from 'socket.io';
import { prisma } from '../../config/db';
import { SmartReplyService } from '../../modules/ai/smartReply.service';
import { expireMessageQueue } from '../../queue/queues';
import { logger } from '../../utils/logger';

export function registerMessageHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;

  // Handles sending a new message
  socket.on('send_message', async (data: {
    roomId: number;
    content: string;
    type: 'text' | 'voice' | 'poll_ref';
    isAnonymous?: boolean;
    expiresIn?: '1m' | '1h' | '24h' | null;
  }) => {
    const { roomId, content, type = 'text', isAnonymous = false, expiresIn } = data;

    try {
      // 1. Verify user room membership
      const membership = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: Number(roomId), userId: user.id } },
      });

      if (!membership) {
        socket.emit('error', { message: 'Access denied: You are not a member of this room' });
        return;
      }

      // 2. Calculate disappearing expiresAt
      let expiresAt: Date | null = null;
      if (expiresIn) {
        let ms = 0;
        if (expiresIn === '1m') ms = 60 * 1000;
        else if (expiresIn === '1h') ms = 60 * 60 * 1000;
        else if (expiresIn === '24h') ms = 24 * 60 * 60 * 1000;

        if (ms > 0) {
          expiresAt = new Date(Date.now() + ms);
        }
      }

      // 3. Save message record in database
      const sender = await prisma.user.findUnique({ where: { id: user.id } });
      if (!sender) return;

      const message = await prisma.message.create({
        data: {
          roomId: Number(roomId),
          senderId: user.id,
          content,
          type,
          isAnonymous,
          expiresAt,
          isSent: true,
        },
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

      // 4. Handle Disappearing Message Job Creation
      if (expiresAt) {
        const delay = expiresAt.getTime() - Date.now();
        await expireMessageQueue.add(
          'expire_message',
          { messageId: message.id, roomId: Number(roomId) },
          { delay, jobId: `exp:${message.id}` }
        );
      }

      // 5. Broadcasters loop - route masked vs unmasked identity depending on role
      const members = await prisma.roomMember.findMany({
        where: { roomId: Number(roomId) },
      });
      const admins = new Set(members.filter((m) => m.role === 'admin').map((m) => m.userId));

      const socketsInRoom = await io.in(`room:${roomId}`).fetchSockets();

      const maskedPayload = {
        id: message.id,
        roomId: message.roomId,
        content: message.content,
        type: message.type,
        isAnonymous: message.isAnonymous,
        createdAt: message.createdAt,
        sender: {
          id: null,
          username: message.sender.anonymousAlias || 'Anonymous',
          avatarUrl: null,
          isAnonymousMode: true,
          anonymousAlias: message.sender.anonymousAlias,
        },
      };

      const unmaskedPayload = {
        id: message.id,
        roomId: message.roomId,
        content: message.content,
        type: message.type,
        isAnonymous: message.isAnonymous,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatarUrl: message.sender.avatarUrl,
          isAnonymousMode: false,
          anonymousAlias: message.sender.anonymousAlias,
        },
        realSenderId: message.senderId, // Admin-only field
      };

      for (const s of socketsInRoom) {
        const socketUserId = s.data.user?.id;
        if (isAnonymous) {
          if (admins.has(socketUserId)) {
            s.emit('new_message', unmaskedPayload);
          } else {
            s.emit('new_message', maskedPayload);
          }
        } else {
          s.emit('new_message', unmaskedPayload);
        }
      }

      // 6. Trigger Smart Reply suggestion background job
      await SmartReplyService.triggerSmartReply(message.id, Number(roomId), user.id, type);

    } catch (err: any) {
      logger.error(`❌ Socket send_message failed: ${err.message}`);
      socket.emit('error', { message: 'Message delivery failed' });
    }
  });

  // Typing events
  socket.on('typing_start', (data: { roomId: number | string }) => {
    socket.to(`room:${data.roomId}`).emit('typing_indicator', {
      userId: user.id,
      username: user.username,
      roomId: Number(data.roomId),
      isTyping: true,
    });
  });

  socket.on('typing_stop', (data: { roomId: number | string }) => {
    socket.to(`room:${data.roomId}`).emit('typing_indicator', {
      userId: user.id,
      username: user.username,
      roomId: Number(data.roomId),
      isTyping: false,
    });
  });
}
