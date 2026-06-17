import { Router } from 'express';
import { LocationService } from './location.service';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

const shareLocationSchema = z.object({
  roomId: z.number().optional(),
  dmPartnerId: z.number().optional(),
  durationMinutes: z.number().int().positive('Duration must be positive'),
}).refine((data) => data.roomId || data.dmPartnerId, {
  message: 'Either roomId or dmPartnerId must be provided',
});

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

router.use(authMiddleware);

router.post(
  '/share',
  validateBody(shareLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await LocationService.shareLocation(req.user!.id, req.body);
    res.status(201).json(location);
  })
);

router.put(
  '/update',
  validateBody(updateLocationSchema),
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;
    const location = await LocationService.updateLocation(req.user!.id, latitude, longitude);
    res.status(200).json(location);
  })
);

router.delete(
  '/stop',
  asyncHandler(async (req, res) => {
    await LocationService.stopLocation(req.user!.id);
    res.status(200).json({ message: 'Location sharing stopped successfully' });
  })
);

export default router;
