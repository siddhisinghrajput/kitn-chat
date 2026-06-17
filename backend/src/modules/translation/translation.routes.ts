import { Router } from 'express';
import { TranslationService } from './translation.service';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/db';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate';

const router = Router();

const translateSchema = z.object({
  targetLanguage: z.string().min(2).max(10),
});

router.post(
  '/:id/translate',
  authMiddleware,
  validateBody(translateSchema),
  asyncHandler(async (req, res) => {
    const messageId = req.params.id;
    const { targetLanguage } = req.body;

    // Retrieve the message to find its associated room ID
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { roomId: true },
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Verify room access permission for safety
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: message.roomId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You must be a member of the message room' });
      return;
    }

    const translatedText = await TranslationService.translateMessage(messageId, targetLanguage);
    res.status(200).json({ translatedText });
  })
);

export default router;
