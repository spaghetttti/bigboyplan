import { prisma } from "@/lib/db";

export type WeeklyGoalStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "MISSED";

export type WeeklyGoalRow = {
  id: string;
  userId: string;
  planId: string;
  categoryId: string | null;
  weekNumber: number;
  year: number;
  title: string;
  description: string | null;
  targetValue: number;
  metricUnit: string;
  actualValue: number;
  status: WeeklyGoalStatus;
  createdAt: Date;
};

export type WeeklyGoalWithCategory = WeeklyGoalRow & {
  category: { id: string; name: string; color: string } | null;
};

/** ISO week-number (1–53) and week-year for a given YYYY-MM-DD. */
export function isoWeekFor(dateISO: string): { weekNumber: number; year: number } {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // ISO week: Thursday of the current week determines the year.
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekNumber, year: dt.getUTCFullYear() };
}

function deriveStatus(actual: number, target: number, current: WeeklyGoalStatus): WeeklyGoalStatus {
  if (current === "MISSED") return "MISSED";
  if (target > 0 && actual >= target) return "COMPLETED";
  if (actual > 0) return "IN_PROGRESS";
  return current === "COMPLETED" ? "IN_PROGRESS" : "PENDING";
}

export async function listWeeklyGoals(
  userId: string,
  weekNumber: number,
  year: number,
): Promise<WeeklyGoalWithCategory[]> {
  return prisma.weeklyGoal.findMany({
    where: { userId, weekNumber, year },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
}

export type CreateWeeklyGoalInput = {
  userId: string;
  planId: string;
  weekNumber: number;
  year: number;
  title: string;
  description?: string | null;
  targetValue: number;
  metricUnit: string;
  categoryId?: string | null;
};

export async function createWeeklyGoal(input: CreateWeeklyGoalInput): Promise<WeeklyGoalRow> {
  return prisma.weeklyGoal.create({
    data: {
      userId: input.userId,
      planId: input.planId,
      weekNumber: input.weekNumber,
      year: input.year,
      title: input.title,
      description: input.description ?? null,
      targetValue: input.targetValue,
      metricUnit: input.metricUnit,
      categoryId: input.categoryId ?? null,
    },
  });
}

export async function updateWeeklyGoalProgress(
  userId: string,
  goalId: string,
  actualValue: number,
): Promise<void> {
  const goal = await prisma.weeklyGoal.findFirst({
    where: { id: goalId, userId },
    select: { targetValue: true, status: true },
  });
  if (!goal) return;
  const next = deriveStatus(actualValue, goal.targetValue, goal.status as WeeklyGoalStatus);
  await prisma.weeklyGoal.update({
    where: { id: goalId },
    data: { actualValue, status: next },
  });
}

export async function setWeeklyGoalStatus(
  userId: string,
  goalId: string,
  status: WeeklyGoalStatus,
): Promise<void> {
  await prisma.weeklyGoal.updateMany({
    where: { id: goalId, userId },
    data: { status },
  });
}

export async function deleteWeeklyGoal(userId: string, goalId: string): Promise<void> {
  await prisma.weeklyGoal.deleteMany({ where: { id: goalId, userId } });
}
