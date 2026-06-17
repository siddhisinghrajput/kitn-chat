import { Router } from 'express';
import { ToneCheckService } from './toneCheck.service';
import { SummarizerService } from './summarizer.service';
import { authMiddleware } from '../../middleware/auth';
import { roomGuard } from '../../middleware/roomGuard';
import { aiRateLimiter } from '../../middleware/rateLimiter';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const toneCheckSchema = z.object({
  content: z.string().min(1),
});

const summarizeSchema = z.object({
  sinceMessageId: z.string().uuid().optional(),
  sinceTimestamp: z.string().datetime().optional(),
});

router.use(authMiddleware);
router.use(aiRateLimiter); // Apply strict AI rate limit (10 req/min)

// POST /api/ai/tone-check (synchronous pre-send check)
router.post(
  '/ai/tone-check',
  validateBody(toneCheckSchema),
  asyncHandler(async (req, res) => {
    const result = await ToneCheckService.checkTone(req.body.content);
    res.status(200).json(result);
  })
);

// POST /api/rooms/:id/summarize (asynchronous, enqueued job)
router.post(
  '/rooms/:id/summarize',
  roomGuard,
  validateBody(summarizeSchema),
  asyncHandler(async (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const { sinceMessageId, sinceTimestamp } = req.body;

    const result = await SummarizerService.requestSummary(
      req.user!.id,
      roomId,
      sinceMessageId,
      sinceTimestamp
    );
    
    res.status(202).json(result);
  })
);

export default router;
