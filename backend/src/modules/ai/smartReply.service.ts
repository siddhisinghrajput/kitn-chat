import { aiSmartReplyQueue } from '../../queue/queues';
import { logger } from '../../utils/logger';

export class SmartReplyService {
  /**
   * Enqueues smart reply generation job after a message is successfully delivered
   */
  static async triggerSmartReply(
    messageId: string,
    roomId: number,
    _senderId: number,
    messageType: string
  ) {
    // Skip smart replies for voice notes as specified
    if (messageType === 'voice') {
      return;
    }

    try {
      // Add job to BullMQ queue
      await aiSmartReplyQueue.add(
        'ai_smart_reply',
        { messageId, roomId },
        { jobId: `reply:${messageId}` }
      );
    } catch (err: any) {
      logger.error(`❌ Failed to enqueue smart reply job: ${err.message}`);
    }
  }
}
