import { prisma } from "@/lib/db";
import {
  addDaysISO,
  eachISODateInRange,
  startOfWeekMondayISO,
  todayISO,
} from "@/lib/dates";
import type { DayAggregate } from "@/lib/types";

export async function taskCompletionsForRange(start: string, end: string) {
  return prisma.taskCompletion.findMany({
    where: { date: { gte: start, lte: end } },
    include: { task: true },
  });
}

export async function activeTasks() {
  return prisma.dailyTask.findMany({
    where: { archived: false },
    orderBy: { sortOrder: "asc" },
  });
}

/** Days in a row ending at `end` where user had any activity. */
export async function computeActivityStreak(end: string, maxLookback = 365): Promise<number> {
  const start = addDaysISO(end, -maxLookback);
  const days = eachISODateInRange(start, end).reverse();

  const [completions, leet, gh] = await Promise.all([
    prisma.taskCompletion.groupBy({
      by: ["date"],
      where: { date: { gte: start, lte: end } },
    }),
    prisma.leetcodeLog.findMany({
      where: { date: { gte: start, lte: end }, count: { gt: 0 } },
      select: { date: true },
    }),
    prisma.githubDailyStat.findMany({
      where: { date: { gte: start, lte: end }, commitCount: { gt: 0 } },
      select: { date: true },
    }),
  ]);

  const active = new Set<string>();
  for (const c of completions) active.add(c.date);
  for (const l of leet) active.add(l.date);
  for (const g of gh) active.add(g.date);

  let streak = 0;
  for (const d of days) {
    if (active.has(d)) streak += 1;
    else break;
  }
  return streak;
}

export async function weekTaskCompletionCount(anchor: string): Promise<number> {
  const weekStart = startOfWeekMondayISO(anchor);
  const weekEnd = addDaysISO(weekStart, 6);
  return prisma.taskCompletion.count({
    where: { date: { gte: weekStart, lte: weekEnd } },
  });
}

export async function sumLeetcodeLastDays(days: number): Promise<number> {
  const end = todayISO();
  const start = addDaysISO(end, -(days - 1));
  const rows = await prisma.leetcodeLog.findMany({
    where: { date: { gte: start, lte: end } },
  });
  return rows.reduce((a, r) => a + r.count, 0);
}

export async function sumGithubLastDays(days: number): Promise<number> {
  const end = todayISO();
  const start = addDaysISO(end, -(days - 1));
  const rows = await prisma.githubDailyStat.findMany({
    where: { date: { gte: start, lte: end } },
  });
  return rows.reduce((a, r) => a + r.commitCount, 0);
}

export async function aggregatesForLastDays(numDays: number): Promise<DayAggregate[]> {
  const end = todayISO();
  const start = addDaysISO(end, -(numDays - 1));
  const dates = eachISODateInRange(start, end);

  const [leetRows, ghRows, completions] = await Promise.all([
    prisma.leetcodeLog.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.githubDailyStat.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.taskCompletion.groupBy({
      by: ["date"],
      where: { date: { gte: start, lte: end } },
      _count: { id: true },
    }),
  ]);

  const leetMap = new Map(leetRows.map((r) => [r.date, r.count]));
  const ghMap = new Map(ghRows.map((r) => [r.date, r.commitCount]));
  const taskMap = new Map(completions.map((c) => [c.date, c._count.id]));

  return dates.map((date) => ({
    date,
    leetcode: leetMap.get(date) ?? 0,
    github: ghMap.get(date) ?? 0,
    tasksDone: taskMap.get(date) ?? 0,
  }));
}
