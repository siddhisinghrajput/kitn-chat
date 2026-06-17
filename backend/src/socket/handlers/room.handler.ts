import { Server, Socket } from 'socket.io';
import { prisma } from '../../config/db';
import { logger } from '../../utils/logger';

export function registerRoomHandlers(_io: Server, socket: Socket) {
  const user = socket.data.user;

  // Handles joining a room
  socket.on('join_room', async (data: { roomId: number | string }) => {
    const roomId = Number(data.roomId);
    if (isNaN(roomId)) {
      socket.emit('error', { message: 'Invalid room ID' });
      return;
    }

    try {
      // Check room access authorization
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        socket.emit('error', { message: 'Access denied: You are not a member of this room' });
        return;
      }

      socket.join(`room:${roomId}`);
      logger.info(`👤 User ${user.username} (ID: ${user.id}) joined room:${roomId}`);
    } catch (err: any) {
      logger.error(`❌ Socket join_room error: ${err.message}`);
      socket.emit('error', { message: 'Internal server error joining room' });
    }
  });

  // Handles leaving a room
  socket.on('leave_room', (data: { roomId: number | string }) => {
    const roomId = Number(data.roomId);
    if (!isNaN(roomId)) {
      socket.leave(`room:${roomId}`);
      logger.info(`👤 User ${user.username} (ID: ${user.id}) left room:${roomId}`);
    }
  });
}
