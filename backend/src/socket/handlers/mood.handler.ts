import { Server, Socket } from 'socket.io';
import { UsersService } from '../../modules/users/users.service';
import { logger } from '../../utils/logger';

export function registerMoodHandlers(_io: Server, socket: Socket) {
  const user = socket.data.user;

  // Handles real-time mood updates via socket
  socket.on('mood_update', async (data: { moodEmoji: string | null; moodText: string | null }) => {
    const { moodEmoji, moodText } = data;
    try {
      // UsersService handles DB update and broadcasts 'mood_updated' to rooms
      await UsersService.updateMood(user.id, moodEmoji, moodText);
      logger.info(`✨ Socket: Mood updated for user ${user.id} (${moodEmoji})`);
    } catch (err: any) {
      logger.error(`❌ Socket mood_update failed: ${err.message}`);
      socket.emit('error', { message: err.message || 'Failed to update mood' });
    }
  });
}
