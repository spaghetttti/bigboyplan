import { prisma } from "@/lib/db";
import {
  addDaysISO,
  eachISODateInRange,
  startOfWeekMondayISO,
  todayISO,
} from "@/lib/dates";
import type { DayAggregate } from "@/lib/types";

export type HeatmapDayMeta = {
  checkedIn: boolean;
  leetcode: number;
  github: number;
  dailyTasks: number;
  planTasksByCategory: Partial<Record<string, number>>;
};

export type HeatmapDay = {
  date: string;
  count: number;
  meta: HeatmapDayMeta;
};

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

export async function aggregatesForHeatmap(numDays = 365): Promise<HeatmapDay[]> {
  const end = todayISO();
  const start = addDaysISO(end, -(numDays - 1));
  const dates = eachISODateInRange(start, end);

  const [checkInRows, leetRows, ghRows, taskCompletions, planTasks] = await Promise.all([
    prisma.dailyCheckIn.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    }),
    prisma.leetcodeLog.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, count: true },
    }),
    prisma.githubDailyStat.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, commitCount: true },
    }),
    prisma.taskCompletion.groupBy({
      by: ["date"],
      where: { date: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.planTask.findMany({
      where: { date: { gte: start, lte: end }, completed: true },
      select: { date: true, category: true },
    }),
  ]);

  const checkInSet = new Set(checkInRows.map((r) => r.date));
  const leetMap = new Map(leetRows.map((r) => [r.date, r.count]));
  const ghMap = new Map(ghRows.map((r) => [r.date, r.commitCount]));
  const dailyTaskMap = new Map(taskCompletions.map((c) => [c.date, c._count.id]));

  // Build planTasks by date→category→count
  const planCatMap = new Map<string, Map<string, number>>();
  for (const t of planTasks) {
    if (!planCatMap.has(t.date)) planCatMap.set(t.date, new Map());
    const catMap = planCatMap.get(t.date)!;
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);
  }

  return dates.map((date) => {
    const checkedIn = checkInSet.has(date);
    const leetcode = leetMap.get(date) ?? 0;
    const github = ghMap.get(date) ?? 0;
    const dailyTasks = dailyTaskMap.get(date) ?? 0;
    const catMap = planCatMap.get(date);
    const planTasksByCategory = catMap ? Object.fromEntries(catMap) : {};
    const planTasksDone = catMap ? Array.from(catMap.values()).reduce((a, b) => a + b, 0) : 0;
    const count = (checkedIn ? 3 : 0) + leetcode + github + dailyTasks + planTasksDone;
    return { date, count, meta: { checkedIn, leetcode, github, dailyTasks, planTasksByCategory } };
  });
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
