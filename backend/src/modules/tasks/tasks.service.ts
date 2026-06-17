import { prisma } from '../../config/db';
import { getIo } from '../../socket/io';

export class TasksService {
  /**
   * Pins a message as a task in a room
   */
  static async pinMessage(messageId: string, pinnedByUserId: number) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if this message is already pinned
    const existing = await prisma.pinnedTask.findFirst({
      where: { messageId },
    });

    if (existing) {
      throw new Error('Message is already pinned as a task');
    }

    const task = await prisma.pinnedTask.create({
      data: {
        messageId,
        roomId: message.roomId,
        pinnedBy: pinnedByUserId,
      },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return task;
  }

  /**
   * Retrieves all pinned tasks for a given room
   */
  static async listTasks(roomId: number) {
    return prisma.pinnedTask.findMany({
      where: { roomId },
      include: {
        message: {
          select: {
            content: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        pinner: {
          select: {
            id: true,
            username: true,
          },
        },
        completer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Toggles the task completion status and broadcasts updates to Socket.IO
   */
  static async toggleCompletion(taskId: number, userId: number) {
    const task = await prisma.pinnedTask.findUnique({
      where: { id: taskId },
      include: {
        room: {
          select: { id: true },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const nextCompleted = !task.isCompleted;

    const updatedTask = await prisma.pinnedTask.update({
      where: { id: taskId },
      data: {
        isCompleted: nextCompleted,
        completedBy: nextCompleted ? userId : null,
        completedAt: nextCompleted ? new Date() : null,
      },
      include: {
        completer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Broadcast update via Socket.IO
    const io = getIo();
    io.to(`room:${task.roomId}`).emit('task_completed', {
      taskId: task.id,
      completedBy: nextCompleted ? updatedTask.completer?.username || 'System' : null,
      isCompleted: nextCompleted,
    });

    return updatedTask;
  }
}
