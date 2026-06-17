import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { env } from '../../config/env';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(username: string, email: string, passwordHash: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        avatarUrl: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}`,
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

  /**
   * Login user and generate JWT pair
   */
  static async login(email: string, passwordHash: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.email);
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        moodEmoji: user.moodEmoji,
        moodText: user.moodText,
        isAnonymousMode: user.isAnonymousMode,
        anonymousAlias: user.anonymousAlias,
      },
      ...tokens
    };
  }

  /**
   * Generate access and refresh token pair
   */
  static async generateTokens(userId: number, username: string, email: string): Promise<Tokens> {
    const payload = { id: userId, username, email };
    
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Save refresh token to Redis with 7 day expiry
    await redis.setex(`refresh_token:${userId}`, 7 * 24 * 60 * 60, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Refresh the access token
   */
  static async refresh(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number };
      const storedToken = await redis.get(`refresh_token:${decoded.id}`);
      
      if (!storedToken || storedToken !== token) {
        throw new Error('Invalid refresh token');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate only a new access token
      const accessToken = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return accessToken;
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Revoke refresh token (Logout)
   */
  static async logout(userId: number): Promise<void> {
    await redis.del(`refresh_token:${userId}`);
  }
}
