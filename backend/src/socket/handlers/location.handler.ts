import { Server, Socket } from 'socket.io';
import { LocationService } from '../../modules/location/location.service';
import { logger } from '../../utils/logger';

export function registerLocationHandlers(_io: Server, socket: Socket) {
  const user = socket.data.user;

  // Handles real-time coordinate updates from clients
  socket.on('location_update', async (data: { latitude: number; longitude: number }) => {
    const { latitude, longitude } = data;
    try {
      // LocationService updates DB and automatically broadcasts coordinates to relevant rooms or DM partner
      await LocationService.updateLocation(user.id, Number(latitude), Number(longitude));
    } catch (err: any) {
      logger.error(`❌ Socket location_update failed: ${err.message}`);
      socket.emit('error', { message: err.message || 'Failed to update location' });
    }
  });
}
