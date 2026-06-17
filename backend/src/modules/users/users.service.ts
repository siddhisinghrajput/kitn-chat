import { prisma } from '../../config/db';
import { generateAnonymousAlias } from '../../utils/anonymousAlias';
import { getIo } from '../../socket/io';

export class UsersService {
  /**
   * Fetch user details
   */
  static async getUser(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        moodEmoji: true,
        moodText: true,
        isAnonymousMode: true,
        anonymousAlias: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update profile information
   */
  static async updateProfile(userId: number, data: { username?: string; email?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        moodEmoji: true,
        moodText: true,
        isAnonymousMode: true,
        anonymousAlias: true,
      },
    });

    return user;
  }

  /**
   * Update mood emoji and message, and broadcast to all rooms they belong to
   */
  static async updateMood(userId: number, moodEmoji: string | null, moodText: string | null) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        moodEmoji,
        moodText,
      },
      select: {
        id: true,
        moodEmoji: true,
        moodText: true,
      },
    });

    // Fetch rooms this user belongs to
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });

    // Broadcast mood_updated event to all rooms the user is in
    const io = getIo();
    memberships.forEach((m) => {
      io.to(`room:${m.roomId}`).emit('mood_updated', {
        userId,
        moodEmoji,
        moodText,
      });
    });

    return user;
  }

  /**
   * Toggle Anonymous mode and generate anonymous alias if enabling
   */
  static async toggleAnonymousMode(userId: number) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAnonymousMode: true },
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    const nextMode = !currentUser.isAnonymousMode;
    const alias = nextMode ? generateAnonymousAlias() : null;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isAnonymousMode: nextMode,
        anonymousAlias: alias,
      },
      select: {
        id: true,
        isAnonymousMode: true,
        anonymousAlias: true,
      },
    });

    return user;
  }
}
