import { Router } from 'express';
import { UsersService } from './users.service';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate';

const router = Router();

// Zod schemas for validation
const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

const updateMoodSchema = z.object({
  mood_emoji: z.string().nullable().optional(),
  mood_text: z.string().nullable().optional(),
  moodEmoji: z.string().nullable().optional(),
  moodText: z.string().nullable().optional(),
});

router.use(authMiddleware);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await UsersService.getUser(req.user!.id);
    res.status(200).json(user);
  })
);

router.put(
  '/me',
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await UsersService.updateProfile(req.user!.id, req.body);
    res.status(200).json(user);
  })
);

router.put(
  '/me/mood',
  validateBody(updateMoodSchema),
  asyncHandler(async (req, res) => {
    // Standardize snake_case or camelCase
    const emoji = req.body.mood_emoji !== undefined ? req.body.mood_emoji : req.body.moodEmoji;
    const text = req.body.mood_text !== undefined ? req.body.mood_text : req.body.moodText;
    
    const user = await UsersService.updateMood(
      req.user!.id,
      emoji || null,
      text || null
    );
    res.status(200).json(user);
  })
);

router.post(
  '/me/anonymous',
  asyncHandler(async (req, res) => {
    const user = await UsersService.toggleAnonymousMode(req.user!.id);
    res.status(200).json(user);
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await UsersService.listAllUsers(req.user!.id);
    res.status(200).json(users);
  })
);

export default router;
