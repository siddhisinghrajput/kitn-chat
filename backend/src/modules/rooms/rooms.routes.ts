import { Router } from 'express';
import { RoomsService } from './rooms.service';
import { authMiddleware } from '../../middleware/auth';
import { roomGuard } from '../../middleware/roomGuard';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

// Zod schemas for room creation
const createRoomSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.enum(['group', 'dm']),
  isPublic: z.boolean().optional(),
  memberIds: z.array(z.number()).optional(),
});

const addMemberSchema = z.object({
  userId: z.number(),
  role: z.enum(['admin', 'member']).optional(),
});

router.use(authMiddleware);

router.post(
  '/',
  validateBody(createRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await RoomsService.createRoom(req.user!.id, req.body);
    res.status(201).json(room);
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rooms = await RoomsService.listUserRooms(req.user!.id);
    res.status(200).json(rooms);
  })
);

router.get(
  '/:id',
  roomGuard,
  asyncHandler(async (req, res) => {
    const room = await RoomsService.getRoomById(parseInt(req.params.id, 10));
    res.status(200).json(room);
  })
);

router.post(
  '/:id/members',
  roomGuard,
  validateBody(addMemberSchema),
  asyncHandler(async (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const { userId, role } = req.body;
    const result = await RoomsService.addMember(roomId, userId, role);
    res.status(201).json(result);
  })
);

router.delete(
  '/:id/members/:userId',
  roomGuard,
  asyncHandler(async (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    
    // Only admins of the room can remove members, or a member can remove themselves (leave)
    const requesterRole = (req as any).roomRole;
    if (requesterRole !== 'admin' && req.user!.id !== userId) {
      res.status(403).json({ error: 'Only administrators can remove other members' });
      return;
    }

    await RoomsService.removeMember(roomId, userId);
    res.status(200).json({ message: 'Member removed successfully' });
  })
);

export default router;
