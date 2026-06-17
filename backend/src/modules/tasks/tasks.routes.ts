import { Router } from 'express';
import { TasksService } from './tasks.service';
import { authMiddleware } from '../../middleware/auth';
import { roomGuard } from '../../middleware/roomGuard';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/db';

const router = Router();

router.use(authMiddleware);

// GET /api/rooms/:id/tasks
router.get(
  '/rooms/:id/tasks',
  roomGuard,
  asyncHandler(async (req, res) => {
    const roomId = parseInt(req.params.id, 10);
    const tasks = await TasksService.listTasks(roomId);
    res.status(200).json(tasks);
  })
);

// PUT /api/tasks/:id/complete
router.put(
  '/tasks/:id/complete',
  asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID format' });
      return;
    }

    // Load task to identify room
    const task = await prisma.pinnedTask.findUnique({
      where: { id: taskId },
      select: { roomId: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Verify room access permission
    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: task.roomId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied: You must be a room member to modify tasks' });
      return;
    }

    const updatedTask = await TasksService.toggleCompletion(taskId, req.user!.id);
    res.status(200).json(updatedTask);
  })
);

export default router;
