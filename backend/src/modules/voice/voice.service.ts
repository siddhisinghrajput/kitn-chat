import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../../config/s3';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';
import { randomUUID } from 'crypto';

export class VoiceService {
  /**
   * Uploads raw audio file buffer to S3/R2 and saves the record in PostgreSQL
   */
  static async uploadVoiceMessage(
    senderId: number,
    roomId: number,
    fileBuffer: Buffer,
    fileMime: string,
    durationSeconds: number,
    isAnonymous: boolean = false
  ) {
    const fileId = randomUUID();
    const extension = fileMime.includes('ogg') ? 'ogg' : 'webm';
    const key = `voices/${roomId}/${fileId}.${extension}`;

    let voiceUrl = '';
    
    // Check if we have active AWS S3 configurations
    if (env.AWS_ACCESS_KEY_ID && env.AWS_ACCESS_KEY_ID !== 'mock-key-id') {
      try {
        // Upload audio file command
        await s3.send(
          new PutObjectCommand({
            Bucket: env.AWS_S3_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: fileMime,
          })
        );
        
        // Generate pre-signed GET URL that expires in 7 days
        const getCommand = new GetObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
        });
        
        voiceUrl = await getSignedUrl(s3, getCommand, { expiresIn: 7 * 24 * 60 * 60 });
      } catch (err: any) {
        logger.error(`❌ S3 voice upload failed: ${err.message}`);
        throw new Error('S3 file upload failed');
      }
    } else {
      // Mock fallback in development environment
      logger.warn('⚠️ S3 config is mock. Emulating S3 URL.');
      voiceUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}?mock=true&expires=${Math.floor(Date.now() / 1000) + 7 * 24 * 3600}`;
    }

    // Save message record
    const message = await prisma.message.create({
      data: {
        roomId,
        senderId,
        content: `[Voice Note: ${durationSeconds}s]`,
        type: 'voice',
        voiceUrl,
        voiceDurationSeconds: durationSeconds,
        isAnonymous,
        isSent: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            isAnonymousMode: true,
            anonymousAlias: true,
          },
        },
      },
    });

    // Create client-facing payload (respecting Anonymous alias settings)
    const socketPayload = {
      id: message.id,
      roomId: message.roomId,
      content: message.content,
      type: message.type,
      voiceUrl: message.voiceUrl,
      voiceDurationSeconds: message.voiceDurationSeconds,
      isAnonymous: message.isAnonymous,
      createdAt: message.createdAt,
      sender: {
        id: message.isAnonymous ? null : message.sender.id,
        username: message.isAnonymous ? message.sender.anonymousAlias || 'Anonymous' : message.sender.username,
        avatarUrl: message.isAnonymous ? null : message.sender.avatarUrl,
        isAnonymousMode: message.isAnonymous,
        anonymousAlias: message.sender.anonymousAlias,
      },
      _realSenderId: message.senderId, // Attached for room admin checks
    };

    // Broadcast the new voice message to room members
    const io = getIo();
    io.to(`room:${roomId}`).emit('new_message', socketPayload);

    return message;
  }
}
