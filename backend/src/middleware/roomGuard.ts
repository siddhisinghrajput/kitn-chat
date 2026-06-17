import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export async function roomGuard(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Detect room ID from params or body
  const roomIdStr = req.params.id || req.params.roomId || req.body.roomId;
  if (!roomIdStr) {
    res.status(400).json({ error: 'Room ID is required' });
    return;
  }

  const roomId = parseInt(roomIdStr, 10);
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'Invalid Room ID format' });
    return;
  }

  try {
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You are not a member of this room' });
      return;
    }

    // Attach role (admin or member) to request object
    (req as any).roomRole = membership.role;
    next();
    return;
  } catch (err) {
    res.status(500).json({ error: 'Internal server error validating room membership' });
    return;
  }
}
