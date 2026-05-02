import Link from "next/link";
import { requireAuth } from "@/lib/auth/require-auth";
import { DashboardChartsLoader } from "@/components/DashboardChartsLoader";
import { SummaryGrid } from "@/components/SummaryGrid";
import { ActivityHeatmapLoader } from "@/components/ActivityHeatmapLoader";
import { CheckInButton } from "@/components/CheckInButton";
import { getUserSettings } from "@/lib/settings";
import {
  aggregatesForLastDays,
  aggregatesForHeatmap,
  computeActivityStreak,
  sumGithubLastDays,
  sumLeetcodeLastDays,
  weekTaskCompletionCount,
} from "@/lib/stats";
import { todayISO } from "@/lib/dates";
import { isoWeekFor, listWeeklyGoals } from "@/lib/weekly-goals";
import { prisma } from "@/lib/db";
import { tagClassForCategory } from "@/lib/tags";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireAuth();

  const today = todayISO();
  const { weekNumber, year } = isoWeekFor(today);
  const monthPrefix = today.slice(0, 7);

  const [
    streak,
    weekTasks,
    leet7,
    gh7,
    series,
    settings,
    monthCheckIns,
    todayCheckIn,
    heatmapData,
    weeklyGoals,
  ] = await Promise.all([
    computeActivityStreak(userId, today),
    weekTaskCompletionCount(userId, today),
    sumLeetcodeLastDays(userId, 7),
    sumGithubLastDays(userId, 7),
    aggregatesForLastDays(userId, 30),
    getUserSettings(userId),
    prisma.dailyCheckIn.findMany({
      where: { userId, date: { startsWith: monthPrefix } },
      select: { date: true },
    }),
    prisma.dailyCheckIn.findUnique({ where: { userId_date: { userId, date: today } } }),
    aggregatesForHeatmap(userId, 365),
    listWeeklyGoals(userId, weekNumber, year),
  ]);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Overview
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Dashboard
      </h2>
      <div className="flex gap-2 justify-between">
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted2 ">
          Streaks and weekly totals combine daily tasks, LeetCode logs, and
          GitHub activity (after you sync in Settings).
        </p>
        <div className="py-4">
          <CheckInButton isCheckedIn={!!todayCheckIn} />
        </div>
      </div>

      <SummaryGrid
        items={[
          { label: "Day streak", value: String(streak) },
          { label: "Task check-ins (week)", value: String(weekTasks) },
          { label: "LeetCode (7d)", value: String(leet7) },
          { label: "GitHub commits (7d)", value: String(gh7) },
        ]}
      />

      {/* Activity heatmap */}
      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
          Activity (last 365 days)
        </p>
        <div className="mt-3 overflow-x-auto">
          <ActivityHeatmapLoader data={heatmapData} />
        </div>
        <p className="mt-3 font-mono text-[10px] text-muted2 ">
          {monthCheckIns.length} day{monthCheckIns.length !== 1 ? "s" : ""} checked in this month
        </p>
      </section>

      {/* Weekly goals */}
      {weeklyGoals.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
            This week&apos;s goals
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {weeklyGoals.map((g) => {
              const pct =
                g.targetValue > 0
                  ? Math.min(100, Math.round((g.actualValue / g.targetValue) * 100))
                  : 0;
              return (
                <li key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {g.category && (
                        <span
                          className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tagClassForCategory(g.category.name)}`}
                        >
                          {g.category.name}
                        </span>
                      )}
                      <span className="text-sm text-text">{g.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted2  shrink-0">
                      {g.actualValue}/{g.targetValue} {g.metricUnit}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-purple transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/goals" className="mt-3 inline-block font-mono text-[11px] text-purple hover:underline">
            Manage goals →
          </Link>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted2 ">
        {settings.githubUsername && (
          <span className="font-mono text-[11px] text-muted2 ">
            GitHub: {settings.githubUsername}
          </span>
        )}
        <Link href="/planner" className="font-mono text-[11px] text-purple hover:underline">
          Open planner →
        </Link>
        <Link href="/settings" className="font-mono text-[11px] text-muted2  hover:underline">
          Sync GitHub →
        </Link>
      </div>

      <DashboardChartsLoader data={series} />
    </main>
  );
}
