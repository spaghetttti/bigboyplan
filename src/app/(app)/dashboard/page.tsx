import Link from "next/link";
import { auth } from "@/auth";
import { DashboardChartsLoader } from "@/components/DashboardChartsLoader";
import { SummaryGrid } from "@/components/SummaryGrid";
import { ActivityHeatmapLoader } from "@/components/ActivityHeatmapLoader";
import { CheckInButton } from "@/components/CheckInButton";
import {
  SETTING_LAST_GH_ERROR,
  SETTING_LAST_GH_SYNC,
  getSetting,
} from "@/lib/settings";
import {
  aggregatesForLastDays,
  aggregatesForHeatmap,
  computeActivityStreak,
  sumGithubLastDays,
  sumLeetcodeLastDays,
  weekTaskCompletionCount,
} from "@/lib/stats";
import { todayISO } from "@/lib/dates";
import {
  ensureSeededPlanForUser,
  planProgressSummary,
} from "@/lib/plan/service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = todayISO();
  const session = await auth();
  const plan = await ensureSeededPlanForUser(session?.user?.id);
  const monthPrefix = today.slice(0, 7); // "YYYY-MM"

  const [
    streak,
    weekTasks,
    leet7,
    gh7,
    series,
    lastSync,
    syncErr,
    progress,
    phases,
    constraints,
    monthCheckIns,
    todayCheckIn,
    heatmapData,
  ] = await Promise.all([
    computeActivityStreak(today),
    weekTaskCompletionCount(today),
    sumLeetcodeLastDays(7),
    sumGithubLastDays(7),
    aggregatesForLastDays(30),
    getSetting(SETTING_LAST_GH_SYNC),
    getSetting(SETTING_LAST_GH_ERROR),
    planProgressSummary(plan.id),
    prisma.planPhase.findMany({
      where: { planId: plan.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.planConstraint.findFirst({
      where: { planId: plan.id },
    }),
    prisma.dailyCheckIn.findMany({
      where: { date: { startsWith: monthPrefix } },
      select: { date: true },
    }),
    prisma.dailyCheckIn.findUnique({ where: { date: today } }),
    aggregatesForHeatmap(365),
  ]);

  const syncLabel = lastSync
    ? new Date(lastSync).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Overview
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Dashboard
      </h2>
      <div className="flex gap-2 justify-between">
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted2">
          Streaks and weekly totals combine daily tasks, LeetCode logs, and
          GitHub activity (after you sync in Settings).
        </p>
        <div className="py-12">
          <CheckInButton isCheckedIn={!!todayCheckIn} />
        </div>
      </div>

      <SummaryGrid
        items={[
          { label: "Day streak", value: String(streak) },
          { label: "Task check-ins (week)", value: String(weekTasks) },
          { label: "LeetCode (7d)", value: String(leet7) },
          { label: "Hybrid score", value: `${progress.hybridScore}%` },
        ]}
      />

      <CheckInButton isCheckedIn={!!todayCheckIn} />

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Activity (last 365 days)
        </p>
        <div className="mt-3 overflow-x-auto">
          <ActivityHeatmapLoader data={heatmapData} />
        </div>
        <p className="mt-3 font-mono text-[10px] text-muted2">
          {monthCheckIns.length} day{monthCheckIns.length !== 1 ? "s" : ""} checked in this month
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Plan constraints
        </p>
        <p className="mt-2 text-sm text-muted2">
          {constraints?.minHoursPerWeek ?? 13}-
          {constraints?.maxHoursPerWeek ?? 18}
          h/week ·{" "}
          {constraints?.hasFullTimeJob
            ? "Full-time job"
            : "No full-time job"} ·{" "}
          {constraints?.eveningsWeekends
            ? "Evenings + weekends"
            : "Flexible schedule"}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Month timeline
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className="rounded border border-border px-3 py-2"
            >
              <p className="font-mono text-[10px] text-muted">
                Month {String(phase.monthNumber).padStart(2, "0")}
              </p>
              <p className="text-sm text-text">{phase.title}</p>
              <p className="text-xs text-muted2">{phase.focus}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted2">
        <span className="font-mono text-[11px] text-muted">
          Last GitHub sync: {syncLabel}
        </span>
        {syncErr ? (
          <span className="rounded border border-amber/40 bg-amber-dim px-2 py-0.5 text-amber">
            {syncErr}
          </span>
        ) : null}
        <Link
          href="/planner"
          className="font-mono text-[11px] text-purple hover:underline"
        >
          Open planner →
        </Link>
        <span className="font-mono text-[11px] text-muted">
          GitHub activity (7d): {gh7}
        </span>
      </div>

      <DashboardChartsLoader data={series} />
    </main>
  );
}
