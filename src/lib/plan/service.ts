import { prisma } from "@/lib/db";
import { FOUR_MONTH_SEED } from "@/lib/plan/seed-data";
import { eachISODateInRange, startOfWeekMondayISO, toISODate } from "@/lib/dates";

export async function getActivePlan() {
  return prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function currentPhaseMonthNumber(planStart: string, isoDate: string): number {
  const [sy, sm, sd] = planStart.split("-").map(Number);
  const [cy, cm, cd] = isoDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const cur = new Date(cy, cm - 1, cd);
  const monthDiff =
    (cur.getFullYear() - start.getFullYear()) * 12 +
    (cur.getMonth() - start.getMonth());
  return Math.min(4, Math.max(1, monthDiff + 1));
}

export async function ensureSeededPlanForUser(userId?: string) {
  const owner = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })
    : null;
  const ownerId = owner?.id ?? null;

  const existing = await prisma.plan.findFirst({
    where: { isActive: true, userId: ownerId },
    orderBy: { createdAt: "desc" },
    include: {
      phases: true,
      templates: true,
      constraints: true,
    },
  });
  if (existing) return existing;

  const now = new Date();
  const start = startOfWeekMondayISO(toISODate(now));
  const endDate = addDays(new Date(start), 16 * 7 - 1);
  const end = toISODate(endDate);

  const created = await prisma.plan.create({
    data: {
      userId: ownerId,
      title: FOUR_MONTH_SEED.title,
      description: FOUR_MONTH_SEED.description,
      startDate: start,
      endDate: end,
    },
  });

  await prisma.planConstraint.create({
    data: {
      planId: created.id,
      ...FOUR_MONTH_SEED.constraints,
    },
  });

  for (const [idx, p] of FOUR_MONTH_SEED.phases.entries()) {
    const phase = await prisma.planPhase.create({
      data: {
        planId: created.id,
        monthNumber: p.monthNumber,
        title: p.title,
        focus: p.focus,
        weekStart: p.weekStart,
        weekEnd: p.weekEnd,
        sortOrder: idx + 1,
      },
    });

    await prisma.planMilestone.createMany({
      data: p.milestones.map((m, mi) => ({
        planId: created.id,
        phaseId: phase.id,
        label: `Month ${p.monthNumber}`,
        value: m,
        sortOrder: mi + 1,
      })),
    });

    await prisma.weeklyTemplate.createMany({
      data: p.templates.flatMap((t, ti) =>
        t.weekdays.map((weekday, wi) => ({
          planId: created.id,
          phaseId: phase.id,
          weekday,
          title: t.title,
          detail: t.detail,
          category: t.category,
          estimatedHours: t.estimatedHours,
          sortOrder: ti * 10 + wi + 1,
        })),
      ),
    });
  }

  const hydrated = await prisma.plan.findUniqueOrThrow({
    where: { id: created.id },
    include: { phases: true, templates: true, constraints: true },
  });

  await generateTasksFromTemplates(
    hydrated.id,
    hydrated.startDate,
    addDaysISO(hydrated.startDate, 27),
  );
  return hydrated;
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

export async function generateTasksFromTemplates(
  planId: string,
  fromDate: string,
  toDate: string,
) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { templates: true, phases: true },
  });
  if (!plan) return { created: 0 };

  const templates = plan.templates.filter((t) => t.isActive);
  if (templates.length === 0) return { created: 0 };

  const dates = eachISODateInRange(fromDate, toDate);
  let created = 0;
  for (const date of dates) {
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const monthNumber = currentPhaseMonthNumber(plan.startDate, date);
    const phase = plan.phases.find((p) => p.monthNumber === monthNumber) ?? null;
    const matched = templates.filter((t) => t.weekday === weekday);

    for (const template of matched) {
      const existing = await prisma.planTask.findFirst({
        where: {
          planId,
          date,
          templateId: template.id,
        },
      });
      if (existing) continue;
      await prisma.planTask.create({
        data: {
          planId,
          phaseId: phase?.id ?? template.phaseId ?? null,
          templateId: template.id,
          date,
          title: template.title,
          detail: template.detail,
          category: template.category,
          estimatedHours: template.estimatedHours,
          source: "TEMPLATE",
        },
      });
      created += 1;
    }
  }

  return { created };
}

export async function getWeekTasks(planId: string, anchorDateISO: string) {
  const weekStart = startOfWeekMondayISO(anchorDateISO);
  const weekEnd = addDaysISO(weekStart, 6);
  const tasks = await prisma.planTask.findMany({
    where: {
      planId,
      date: { gte: weekStart, lte: weekEnd },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return { weekStart, weekEnd, tasks };
}

export async function getHeatmapData(planId: string, days: number) {
  const end = toISODate(new Date());
  const start = addDaysISO(end, -(days - 1));
  const rows = await prisma.planTask.findMany({
    where: {
      planId,
      date: { gte: start, lte: end },
    },
    select: { date: true, completed: true, estimatedHours: true },
  });
  const grouped = new Map<
    string,
    { total: number; completed: number; estHours: number }
  >();
  for (const row of rows) {
    const current = grouped.get(row.date) ?? { total: 0, completed: 0, estHours: 0 };
    current.total += 1;
    if (row.completed) current.completed += 1;
    current.estHours += row.estimatedHours ?? 0;
    grouped.set(row.date, current);
  }
  return eachISODateInRange(start, end).map((date) => {
    const v = grouped.get(date) ?? { total: 0, completed: 0, estHours: 0 };
    return {
      date,
      totalTasks: v.total,
      completedTasks: v.completed,
      estimatedHours: v.estHours,
      score: v.completed,
    };
  });
}

export async function planProgressSummary(planId: string) {
  const [tasks, milestones] = await Promise.all([
    prisma.planTask.findMany({
      where: { planId },
      select: { completed: true },
    }),
    prisma.planMilestone.findMany({
      where: { planId },
      select: { isCompleted: true },
    }),
  ]);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.completed).length;
  const taskPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalMilestones = milestones.length;
  const doneMilestones = milestones.filter((m) => m.isCompleted).length;
  const milestonePercent =
    totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;
  return {
    totalTasks,
    doneTasks,
    taskPercent,
    totalMilestones,
    doneMilestones,
    milestonePercent,
    hybridScore: Math.round(taskPercent * 0.7 + milestonePercent * 0.3),
  };
}
