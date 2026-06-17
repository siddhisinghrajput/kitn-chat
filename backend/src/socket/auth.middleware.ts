import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SocketUser {
  id: number;
  username: string;
  email: string;
}

/**
 * Socket.IO authentication handshake middleware
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    logger.warn('🔌 Socket connection rejected: No handshake token provided');
    return next(new Error('Authentication token is required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as SocketUser;
    socket.data.user = decoded;

    // Join user-specific socket room to allow sending private system payloads (e.g., ai_summary_ready)
    socket.join(`user:${decoded.id}`);

    next();
  } catch (err) {
    logger.warn('🔌 Socket connection rejected: Invalid or expired token');
    next(new Error('Authentication failed: Token is invalid'));
  }
}
