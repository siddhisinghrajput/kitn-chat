import { Worker } from 'bullmq';
import { queueConnection } from '../../config/bull';
import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';
import { logger } from '../../utils/logger';

export const locationExpireWorker = new Worker(
  'location_expire',
  async (job) => {
    const { userId } = job.data;
    logger.info(`📍 Auto-expiring live location for user: ${userId}`);

    try {
      const location = await prisma.liveLocation.findFirst({
        where: { userId },
      });

      if (!location) {
        return;
      }

      // Remove row
      await prisma.liveLocation.delete({
        where: { id: location.id },
      });

      // Notify clients
      const io = getIo();
      const payload = { userId };

      if (location.roomId) {
        io.to(`room:${location.roomId}`).emit('location_stopped', payload);
      }
      if (location.dmPartnerId) {
        io.to(`user:${location.dmPartnerId}`).to(`user:${userId}`).emit('location_stopped', payload);
      }
    } catch (err: any) {
      logger.error(`❌ Location expire worker failed: ${err.message}`);
      throw err;
    }
  },
  { connection: queueConnection }
);
