import { prisma } from "@/lib/db";

export type TaskCreateInput = {
  userId: string;
  title: string;
  notes?: string | null;
  isRecurring: boolean;
  dueDate?: string | null;
  categoryIds?: string[];
};

export type TaskRow = {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  completed: boolean;
  isRecurring: boolean;
  dueDate: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type TaskWithTags = TaskRow & {
  taskTags: { categoryId: string; category: { id: string; name: string; color: string } }[];
};

export async function createTask(input: TaskCreateInput): Promise<TaskRow> {
  const { categoryIds = [], ...rest } = input;
  return prisma.task.create({
    data: {
      userId: rest.userId,
      title: rest.title,
      notes: rest.notes ?? null,
      isRecurring: rest.isRecurring,
      dueDate: rest.isRecurring ? null : (rest.dueDate ?? null),
      taskTags: categoryIds.length
        ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
    },
  });
}

export async function listTasksForDate(
  userId: string,
  date: string,
): Promise<TaskWithTags[]> {
  return prisma.task.findMany({
    where: {
      userId,
      OR: [{ isRecurring: true }, { dueDate: date }],
    },
    include: { taskTags: { include: { category: true } } },
    orderBy: [{ isRecurring: "desc" }, { createdAt: "asc" }],
  });
}

export async function listTasksForWeek(
  userId: string,
  weekStart: string,
  weekEnd: string,
): Promise<TaskWithTags[]> {
  return prisma.task.findMany({
    where: {
      userId,
      isRecurring: false,
      dueDate: { gte: weekStart, lte: weekEnd },
    },
    include: { taskTags: { include: { category: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
}

export async function listRecurringTasks(userId: string): Promise<TaskWithTags[]> {
  return prisma.task.findMany({
    where: { userId, isRecurring: true },
    include: { taskTags: { include: { category: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Toggles completion for a task on a given date.
 * - Recurring task: uses TaskCompletion row (per-day check-off).
 * - Scheduled task: flips Task.completed itself.
 */
export async function toggleTaskCompletion(
  userId: string,
  taskId: string,
  date: string,
): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true, isRecurring: true, completed: true },
  });
  if (!task) return;

  if (task.isRecurring) {
    const existing = await prisma.taskCompletion.findUnique({
      where: { taskId_date: { taskId, date } },
    });
    if (existing) {
      await prisma.taskCompletion.delete({ where: { id: existing.id } });
    } else {
      await prisma.taskCompletion.create({ data: { userId, taskId, date } });
    }
  } else {
    const nextCompleted = !task.completed;
    await prisma.task.update({
      where: { id: taskId },
      data: { completed: nextCompleted, completedAt: nextCompleted ? new Date() : null },
    });
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await prisma.task.deleteMany({ where: { id: taskId, userId } });
}

export async function setTaskTags(
  userId: string,
  taskId: string,
  categoryIds: string[],
): Promise<void> {
  const owned = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!owned) return;
  await prisma.taskTag.deleteMany({ where: { taskId } });
  if (categoryIds.length > 0) {
    await prisma.taskTag.createMany({
      data: categoryIds.map((categoryId) => ({ taskId, categoryId })),
      skipDuplicates: true,
    });
  }
}

export async function getCompletionsForDate(
  userId: string,
  date: string,
): Promise<Set<string>> {
  const rows = await prisma.taskCompletion.findMany({
    where: { userId, date },
    select: { taskId: true },
  });
  return new Set(rows.map((r) => r.taskId));
}
