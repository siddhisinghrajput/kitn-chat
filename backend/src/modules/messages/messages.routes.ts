import { Router } from 'express';
import { MessagesService } from './messages.service';
import { TasksService } from '../tasks/tasks.service';
import { authMiddleware } from '../../middleware/auth';
import { roomGuard } from '../../middleware/roomGuard';
import { validateBody, validateQuery } from '../../middleware/validate';
import { scheduleMessageSchema } from './messages.schema';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/db';
import { z } from 'zod';

const router = Router();

const getMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

router.use(authMiddleware);

// GET /api/rooms/:id/messages
router.get(
  '/rooms/:id/messages',
  roomGuard,
  validateQuery(getMessagesQuerySchema),
  asyncHandler(async (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await MessagesService.listMessages(roomId, cursor, limit, req.user!.id);
    res.status(200).json(result);
  })
);

// POST /api/messages/:id/pin
router.post(
  '/messages/:id/pin',
  asyncHandler(async (req, res) => {
    const messageId = req.params.id;

    // Load message to identify the room
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { roomId: true },
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Verify room access permission
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: message.roomId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You must be a room member to pin messages' });
      return;
    }

    const task = await TasksService.pinMessage(messageId, req.user!.id);
    res.status(201).json(task);
  })
);

// POST /api/messages/schedule
router.post(
  '/messages/schedule',
  validateBody(scheduleMessageSchema),
  asyncHandler(async (req, res) => {
    const { roomId, content, scheduledAt } = req.body;
    
    // Check if requester is a member of the destination room
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: Cannot schedule message for a room you do not belong to' });
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    const result = await MessagesService.scheduleMessage(req.user!.id, roomId, content, scheduledDate);
    res.status(201).json(result);
  })
);

// DELETE /api/messages/schedule/:id
router.delete(
  '/messages/schedule/:id',
  asyncHandler(async (req, res) => {
    await MessagesService.cancelScheduledMessage(req.params.id, req.user!.id);
    res.status(200).json({ message: 'Scheduled message cancelled and deleted' });
  })
);

export default router;
