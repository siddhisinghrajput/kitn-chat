import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface UserPayload {
  id: number;
  username: string;
  email: string;
}

// Extend global Express namespace to support typed req.user
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = payload;
    next();
    return;
  } catch (err) {
    res.status(401).json({ error: 'Token is expired or invalid' });
    return;
  }
}
