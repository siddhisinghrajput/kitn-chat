import { Server } from 'socket.io';

let ioInstance: Server | null = null;

/**
 * Stores reference to initialized Socket.IO server
 */
export function setIo(io: Server) {
  ioInstance = io;
}

/**
 * Retrieves reference to Socket.IO server
 */
export function getIo(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO is not initialized yet.');
  }
  return ioInstance;
}
