import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';
import { pollExpireQueue } from '../../queue/queues';

export class PollsService {
  /**
   * Create a new poll in a room and post a poll_ref message
   */
  static async createPoll(
    creatorId: number,
    roomId: number,
    data: { question: string; options: string[]; expiresAt?: string }
  ) {
    const { question, options, expiresAt } = data;

    // First save the message (type poll_ref) so we can link it
    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: creatorId,
        content: `📊 Poll: ${question}`,
        type: 'poll_ref',
        isSent: true,
      },
    });

    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

    // Create poll with its options
    const poll = await prisma.poll.create({
      data: {
        roomId,
        messageId: message.id,
        question,
        createdBy: creatorId,
        expiresAt: parsedExpiresAt,
        options: {
          create: options.map((opt) => ({ optionText: opt })),
        },
      },
      include: {
        options: true,
      },
    });

    // Schedule auto-closing if expiresAt is set
    if (parsedExpiresAt) {
      const delay = parsedExpiresAt.getTime() - Date.now();
      if (delay > 0) {
        await pollExpireQueue.add(
          'poll_expire',
          { pollId: poll.id },
          { delay, jobId: `poll:${poll.id}` }
        );
      }
    }

    // Emit the message via Socket.IO
    const io = getIo();
    io.to(`room:${roomId}`).emit('new_message', {
      ...message,
      poll,
      sender: { id: creatorId }, // simple mock profile
    });

    return poll;
  }

  /**
   * Cast/change a vote atomically and broadcast live result update
   */
  static async vote(pollId: number, userId: number, optionId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
      },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    // Check if expired
    if (poll.expiresAt && poll.expiresAt.getTime() < Date.now()) {
      throw new Error('This poll has expired');
    }

    // Verify option is valid for this poll
    const optionIsValid = poll.options.some((opt) => opt.id === optionId);
    if (!optionIsValid) {
      throw new Error('Invalid poll option selected');
    }

    // Transaction to safely update votes and count tallies
    await prisma.$transaction(async (tx) => {
      const existingVote = await tx.pollVote.findUnique({
        where: {
          pollId_userId: { pollId, userId },
        },
      });

      if (existingVote) {
        if (existingVote.optionId === optionId) {
          return; // Same option, no modification
        }
        // Decrement count on the old option
        await tx.pollOption.update({
          where: { id: existingVote.optionId },
          data: { voteCount: { decrement: 1 } },
        });
        // Increment count on the new option
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } },
        });
        // Update the vote row
        await tx.pollVote.update({
          where: { pollId_userId: { pollId, userId } },
          data: { optionId },
        });
      } else {
        // Increment new option
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } },
        });
        // Insert vote row
        await tx.pollVote.create({
          data: { pollId, userId, optionId },
        });
      }
    });

    // Load fresh options list with updated tallies
    const updatedOptions = await prisma.pollOption.findMany({
      where: { pollId },
      select: {
        id: true,
        optionText: true,
        voteCount: true,
      },
    });

    // Broadcast update to all room subscribers
    const io = getIo();
    io.to(`room:${poll.roomId}`).emit('poll_updated', {
      pollId,
      options: updatedOptions,
    });

    return updatedOptions;
  }

  /**
   * Retrieve poll details along with current results
   */
  static async getPoll(pollId: number) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          select: {
            id: true,
            optionText: true,
            voteCount: true,
          },
        },
      },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    return poll;
  }
}
