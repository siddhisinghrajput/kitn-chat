import { Router } from 'express';
import { upload } from '../../middleware/upload';
import { VoiceService } from './voice.service';
import { authMiddleware } from '../../middleware/auth';
import { roomGuard } from '../../middleware/roomGuard';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/',
  authMiddleware,
  upload.single('audio'),
  // roomGuard will extract roomId from req.body.roomId since upload.single parses body parameters first
  roomGuard,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Audio file is required' });
      return;
    }

    const roomId = parseInt(req.body.roomId, 10);
    const durationSeconds = parseInt(req.body.durationSeconds, 10) || 0;
    const isAnonymous = req.body.isAnonymous === 'true' || req.body.isAnonymous === true;

    const message = await VoiceService.uploadVoiceMessage(
      req.user!.id,
      roomId,
      req.file.buffer,
      req.file.mimetype,
      durationSeconds,
      isAnonymous
    );

    res.status(201).json(message);
  })
);

export default router;
