import { prisma } from "@/lib/db";
import { addDaysISO, todayISO } from "@/lib/dates";

export type PlanRow = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
};

export async function getActivePlan(userId: string): Promise<PlanRow | null> {
  return prisma.plan.findFirst({
    where: { userId, isActive: true, isArchived: false },
    orderBy: { createdAt: "desc" },
  });
}

/** Returns the user's active plan, creating a default one if none exists. */
export async function ensureActivePlan(userId: string): Promise<PlanRow> {
  const existing = await getActivePlan(userId);
  if (existing) return existing;

  const start = todayISO();
  const end = addDaysISO(start, 16 * 7 - 1); // ~4 months
  return prisma.plan.create({
    data: {
      userId,
      title: "My plan",
      description: null,
      startDate: start,
      endDate: end,
      isActive: true,
    },
  });
}

export async function createPlan(
  userId: string,
  data: { title: string; description?: string | null; startDate: string; endDate?: string | null },
): Promise<PlanRow> {
  // Deactivate any other active plan for this user (one active at a time).
  await prisma.plan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
  return prisma.plan.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      isActive: true,
    },
  });
}

export async function setActivePlan(userId: string, planId: string): Promise<void> {
  await prisma.plan.updateMany({
    where: { userId, isActive: true, NOT: { id: planId } },
    data: { isActive: false },
  });
  await prisma.plan.updateMany({
    where: { userId, id: planId },
    data: { isActive: true, isArchived: false },
  });
}

export async function archivePlan(userId: string, planId: string): Promise<void> {
  await prisma.plan.updateMany({
    where: { userId, id: planId },
    data: { isArchived: true, isActive: false },
  });
}
