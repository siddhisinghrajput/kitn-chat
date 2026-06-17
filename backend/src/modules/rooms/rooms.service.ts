import { prisma } from '../../config/db';

export class RoomsService {
  /**
   * Create a new room (group or DM)
   */
  static async createRoom(
    creatorId: number,
    data: { name?: string; type: 'group' | 'dm'; isPublic?: boolean; memberIds?: number[] }
  ) {
    const { name, type, isPublic = false, memberIds = [] } = data;

    // For DM, we ensure there is only one DM between two specific users
    if (type === 'dm') {
      if (memberIds.length !== 1) {
        throw new Error('DM requires exactly one partner memberId');
      }
      const partnerId = memberIds[0];
      if (partnerId === creatorId) {
        throw new Error('Cannot create a DM with yourself');
      }

      // Check for existing DM room
      const existingDMRoom = await prisma.room.findFirst({
        where: {
          type: 'dm',
          AND: [
            { members: { some: { userId: creatorId } } },
            { members: { some: { userId: partnerId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  moodEmoji: true,
                  moodText: true,
                },
              },
            },
          },
        },
      });

      if (existingDMRoom) {
        return existingDMRoom;
      }
    }

    // Create room and add members
    const room = await prisma.room.create({
      data: {
        name: type === 'group' ? name || 'New Group' : undefined,
        type,
        isPublic: type === 'group' ? isPublic : false,
        createdBy: creatorId,
        members: {
          create: [
            { userId: creatorId, role: 'admin' },
            ...memberIds.map((id) => ({ userId: id, role: 'member' as const })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                moodEmoji: true,
                moodText: true,
                isAnonymousMode: true,
                anonymousAlias: true,
              },
            },
          },
        },
      },
    });

    return room;
  }

  /**
   * List all rooms that a user belongs to
   */
  static async listUserRooms(userId: number) {
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });

    const roomIds = memberships.map((m) => m.roomId);

    return prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                moodEmoji: true,
                moodText: true,
                isAnonymousMode: true,
                anonymousAlias: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch room details by ID
   */
  static async getRoomById(roomId: number) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                moodEmoji: true,
                moodText: true,
                isAnonymousMode: true,
                anonymousAlias: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    return room;
  }

  /**
   * Add a user to a group room
   */
  static async addMember(roomId: number, userId: number, role: 'admin' | 'member' = 'member') {
    // Check if member already exists
    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing) {
      throw new Error('User is already a member of this room');
    }

    return prisma.roomMember.create({
      data: {
        roomId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Remove a user from a group room
   */
  static async removeMember(roomId: number, userId: number) {
    return prisma.roomMember.delete({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });
  }
}
