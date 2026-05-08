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
  leetcodeEasy: number;
  leetcodeMedium: number;
  leetcodeHard: number;
  github: number;
  recurringCompletions: number;
  scheduledTasksDone: number;
  journaled: boolean;
};

export type HeatmapDay = {
  date: string;
  count: number;
  meta: HeatmapDayMeta;
};

export async function recurringTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId, isRecurring: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function taskCompletionsForRange(userId: string, start: string, end: string) {
  return prisma.taskCompletion.findMany({
    where: { userId, date: { gte: start, lte: end } },
    include: { task: true },
  });
}

function leetTotal(r: { easyCount: number; mediumCount: number; hardCount: number }) {
  return r.easyCount + r.mediumCount + r.hardCount;
}

export async function computeActivityStreak(
  userId: string,
  end: string,
  maxLookback = 365,
): Promise<number> {
  const start = addDaysISO(end, -maxLookback);
  const days = eachISODateInRange(start, end).reverse();

  const [completions, leet, gh, checkIns] = await Promise.all([
    prisma.taskCompletion.groupBy({
      by: ["date"],
      where: { userId, date: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    prisma.leetcodeLog.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, easyCount: true, mediumCount: true, hardCount: true },
    }),
    prisma.githubDailyStat.findMany({
      where: { userId, date: { gte: start, lte: end }, commits: { gt: 0 } },
      select: { date: true },
    }),
    prisma.dailyCheckIn.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true },
    }),
  ]);

  const active = new Set<string>();
  for (const c of completions) active.add(c.date);
  for (const l of leet) if (leetTotal(l) > 0) active.add(l.date);
  for (const g of gh) active.add(g.date);
  for (const c of checkIns) active.add(c.date);

  let streak = 0;
  for (const d of days) {
    if (active.has(d)) streak += 1;
    else break;
  }
  return streak;
}

export async function weekTaskCompletionCount(userId: string, anchor: string): Promise<number> {
  const weekStart = startOfWeekMondayISO(anchor);
  const weekEnd = addDaysISO(weekStart, 6);
  return prisma.taskCompletion.count({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
  });
}

export async function sumLeetcodeLastDays(userId: string, days: number): Promise<number> {
  const end = todayISO();
  const start = addDaysISO(end, -(days - 1));
  const rows = await prisma.leetcodeLog.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { easyCount: true, mediumCount: true, hardCount: true },
  });
  return rows.reduce((a, r) => a + leetTotal(r), 0);
}

export async function sumGithubLastDays(userId: string, days: number): Promise<number> {
  const end = todayISO();
  const start = addDaysISO(end, -(days - 1));
  const rows = await prisma.githubDailyStat.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { commits: true },
  });
  return rows.reduce((a, r) => a + r.commits, 0);
}

export async function aggregatesForHeatmap(
  userId: string,
  numDays = 365,
): Promise<HeatmapDay[]> {
  const end = todayISO();
  const start = addDaysISO(end, -(numDays - 1));
  const dates = eachISODateInRange(start, end);

  const [checkInRows, leetRows, ghRows, recurringCompletions, scheduledTasks, journals] =
    await Promise.all([
      prisma.dailyCheckIn.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { date: true },
      }),
      prisma.leetcodeLog.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { date: true, easyCount: true, mediumCount: true, hardCount: true },
      }),
      prisma.githubDailyStat.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { date: true, commits: true },
      }),
      prisma.taskCompletion.groupBy({
        by: ["date"],
        where: {
          userId,
          date: { gte: start, lte: end },
          task: { isRecurring: true },
        },
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: {
          userId,
          isRecurring: false,
          completed: true,
          dueDate: { gte: start, lte: end },
        },
        select: { dueDate: true },
      }),
      prisma.journalEntry.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { date: true },
      }),
    ]);

  const checkInSet = new Set(checkInRows.map((r) => r.date));
  const leetMap = new Map(
    leetRows.map((r) => [r.date, { total: leetTotal(r), easy: r.easyCount, medium: r.mediumCount, hard: r.hardCount }]),
  );
  const ghMap = new Map(ghRows.map((r) => [r.date, r.commits]));
  const recurringMap = new Map(
    recurringCompletions.map((c) => [c.date, (c._count as { _all: number })._all]),
  );
  const scheduledMap = new Map<string, number>();
  for (const t of scheduledTasks) {
    if (!t.dueDate) continue;
    scheduledMap.set(t.dueDate, (scheduledMap.get(t.dueDate) ?? 0) + 1);
  }
  const journaledSet = new Set(journals.map((j) => j.date));

  return dates.map((date) => {
    const checkedIn = checkInSet.has(date);
    const leet = leetMap.get(date) ?? { total: 0, easy: 0, medium: 0, hard: 0 };
    const github = ghMap.get(date) ?? 0;
    const recurringCompletions = recurringMap.get(date) ?? 0;
    const scheduledTasksDone = scheduledMap.get(date) ?? 0;
    const journaled = journaledSet.has(date);
    const count =
      (checkedIn ? 3 : 0) +
      leet.total +
      github +
      recurringCompletions +
      scheduledTasksDone +
      (journaled ? 1 : 0);
    return {
      date,
      count,
      meta: {
        checkedIn,
        leetcode: leet.total,
        leetcodeEasy: leet.easy,
        leetcodeMedium: leet.medium,
        leetcodeHard: leet.hard,
        github,
        recurringCompletions,
        scheduledTasksDone,
        journaled,
      },
    };
  });
}

export async function aggregatesForLastDays(
  userId: string,
  numDays: number,
): Promise<DayAggregate[]> {
  const end = todayISO();
  const start = addDaysISO(end, -(numDays - 1));
  const dates = eachISODateInRange(start, end);

  const [leetRows, ghRows, completions] = await Promise.all([
    prisma.leetcodeLog.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, easyCount: true, mediumCount: true, hardCount: true },
    }),
    prisma.githubDailyStat.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, commits: true },
    }),
    prisma.taskCompletion.groupBy({
      by: ["date"],
      where: { userId, date: { gte: start, lte: end } },
      _count: { _all: true },
    }),
  ]);

  const leetMap = new Map(leetRows.map((r) => [r.date, leetTotal(r)]));
  const ghMap = new Map(ghRows.map((r) => [r.date, r.commits]));
  const taskMap = new Map(
    completions.map((c) => [c.date, (c._count as { _all: number })._all]),
  );

  return dates.map((date) => ({
    date,
    leetcode: leetMap.get(date) ?? 0,
    github: ghMap.get(date) ?? 0,
    tasksDone: taskMap.get(date) ?? 0,
  }));
}
