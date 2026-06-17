import { Router } from 'express';
import { AuthService } from './auth.service';
import { validateBody } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const user = await AuthService.register(username, email, password);
    res.status(201).json(user);
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.status(200).json(result);
  })
);

router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const accessToken = await AuthService.refresh(refreshToken);
    res.status(200).json({ accessToken });
  })
);

router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    // req.user is guaranteed by authMiddleware
    await AuthService.logout(req.user!.id);
    res.status(200).json({ message: 'Logged out successfully' });
  })
);

export default router;
