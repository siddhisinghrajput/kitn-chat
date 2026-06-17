import { Server, Socket } from 'socket.io';
import { PollsService } from '../../modules/polls/polls.service';
import { logger } from '../../utils/logger';

export function registerPollHandlers(_io: Server, socket: Socket) {
  const user = socket.data.user;

  // Handles poll votes cast via Socket.IO
  socket.on('poll_vote', async (data: { pollId: number; optionId: number }) => {
    const { pollId, optionId } = data;
    try {
      // PollsService.vote cast vote in transaction and automatically broadcasts 'poll_updated'
      await PollsService.vote(Number(pollId), user.id, Number(optionId));
      logger.info(`📊 Socket: Registered vote by user ${user.id} on poll ${pollId}`);
    } catch (err: any) {
      logger.error(`❌ Socket poll_vote failed: ${err.message}`);
      socket.emit('error', { message: err.message || 'Failed to submit vote' });
    }
  });
}
