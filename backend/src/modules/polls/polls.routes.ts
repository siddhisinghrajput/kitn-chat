import { Router } from 'express';
import { PollsService } from './polls.service';
import { authMiddleware } from '../../middleware/auth';
import { roomGuard } from '../../middleware/roomGuard';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/db';
import { z } from 'zod';

const router = Router();

const createPollSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(10),
  expiresAt: z.string().datetime().optional(),
});

const voteSchema = z.object({
  optionId: z.number().int(),
});

router.use(authMiddleware);

// POST /api/rooms/:id/polls
router.post(
  '/rooms/:id/polls',
  roomGuard,
  validateBody(createPollSchema),
  asyncHandler(async (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const poll = await PollsService.createPoll(req.user!.id, roomId, req.body);
    res.status(201).json(poll);
  })
);

// POST /api/polls/:id/vote
router.post(
  '/polls/:id/vote',
  validateBody(voteSchema),
  asyncHandler(async (req, res) => {
    const pollId = parseInt(req.params.id, 10);
    const { optionId } = req.body;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { roomId: true },
    });

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    // Check if requester is a member of the room containing this poll
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: poll.roomId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You must be a room member to vote' });
      return;
    }

    const updatedOptions = await PollsService.vote(pollId, req.user!.id, optionId);
    res.status(200).json({ message: 'Vote registered successfully', options: updatedOptions });
  })
);

// GET /api/polls/:id
router.get(
  '/polls/:id',
  asyncHandler(async (req, res) => {
    const pollId = parseInt(req.params.id, 10);
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { roomId: true },
    });

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    // Verify room access
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: poll.roomId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You must be a room member to view poll results' });
      return;
    }

    const result = await PollsService.getPoll(pollId);
    res.status(200).json(result);
  })
);

export default router;
