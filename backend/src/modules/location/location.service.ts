import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';
import { locationExpireQueue } from '../../queue/queues';

export class LocationService {
  /**
   * Share/start live location in a room or DM
   */
  static async shareLocation(
    userId: number,
    data: { roomId?: number; dmPartnerId?: number; durationMinutes: number }
  ) {
    const { roomId, dmPartnerId, durationMinutes } = data;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Look for existing live location sharing
    const existing = await prisma.liveLocation.findFirst({
      where: { userId },
    });

    let location;
    if (existing) {
      location = await prisma.liveLocation.update({
        where: { id: existing.id },
        data: {
          roomId,
          dmPartnerId,
          expiresAt,
        },
      });
    } else {
      location = await prisma.liveLocation.create({
        data: {
          userId,
          roomId,
          dmPartnerId,
          latitude: 0,
          longitude: 0,
          expiresAt,
        },
      });
    }

    // Remove any existing job
    const job = await locationExpireQueue.getJob(`loc:${userId}`);
    if (job) {
      await job.remove();
    }

    // Schedule location expiration
    await locationExpireQueue.add(
      'location_expire',
      { userId },
      { delay: durationMinutes * 60 * 1000, jobId: `loc:${userId}` }
    );

    return location;
  }

  /**
   * Update current coordinates and broadcast location_updated event
   */
  static async updateLocation(userId: number, latitude: number, longitude: number) {
    const location = await prisma.liveLocation.findFirst({
      where: { userId },
    });

    if (!location) {
      throw new Error('No active location sharing found for this user');
    }

    if (location.expiresAt.getTime() < Date.now()) {
      throw new Error('Location sharing session has expired');
    }

    const updated = await prisma.liveLocation.update({
      where: { id: location.id },
      data: { latitude, longitude },
    });

    // Broadcast update to the room or DM partner
    const io = getIo();
    const payload = {
      userId,
      latitude,
      longitude,
      expiresAt: updated.expiresAt,
    };

    if (updated.roomId) {
      io.to(`room:${updated.roomId}`).emit('location_updated', payload);
    }
    if (updated.dmPartnerId) {
      io.to(`user:${updated.dmPartnerId}`).to(`user:${userId}`).emit('location_updated', payload);
    }

    return updated;
  }

  /**
   * Stop sharing location and notify room members/partner
   */
  static async stopLocation(userId: number) {
    const location = await prisma.liveLocation.findFirst({
      where: { userId },
    });

    if (!location) {
      return null;
    }

    // Delete record from DB
    await prisma.liveLocation.delete({
      where: { id: location.id },
    });

    // Cancel BullMQ job
    const job = await locationExpireQueue.getJob(`loc:${userId}`);
    if (job) {
      await job.remove();
    }

    // Broadcast location stoppage event
    const io = getIo();
    const payload = { userId };

    if (location.roomId) {
      io.to(`room:${location.roomId}`).emit('location_stopped', payload);
    }
    if (location.dmPartnerId) {
      io.to(`user:${location.dmPartnerId}`).to(`user:${userId}`).emit('location_stopped', payload);
    }

    return true;
  }
}
