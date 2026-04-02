import Link from "next/link";
import { DashboardChartsLoader } from "@/components/DashboardChartsLoader";
import { SummaryGrid } from "@/components/SummaryGrid";
import {
  SETTING_LAST_GH_ERROR,
  SETTING_LAST_GH_SYNC,
  getSetting,
} from "@/lib/settings";
import {
  aggregatesForLastDays,
  computeActivityStreak,
  sumGithubLastDays,
  sumLeetcodeLastDays,
  weekTaskCompletionCount,
} from "@/lib/stats";
import { todayISO } from "@/lib/dates";

export default async function DashboardPage() {
  const today = todayISO();
  const [
    streak,
    weekTasks,
    leet7,
    gh7,
    series,
    lastSync,
    syncErr,
  ] = await Promise.all([
    computeActivityStreak(today),
    weekTaskCompletionCount(today),
    sumLeetcodeLastDays(7),
    sumGithubLastDays(7),
    aggregatesForLastDays(30),
    getSetting(SETTING_LAST_GH_SYNC),
    getSetting(SETTING_LAST_GH_ERROR),
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
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted2">
        Streaks and weekly totals combine daily tasks, LeetCode logs, and GitHub
        activity (after you sync in Settings).
      </p>

      <SummaryGrid
        items={[
          { label: "Day streak", value: String(streak) },
          { label: "Task check-ins (week)", value: String(weekTasks) },
          { label: "LeetCode (7d)", value: String(leet7) },
          { label: "GitHub activity (7d)", value: String(gh7) },
        ]}
      />

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
          href="/today"
          className="font-mono text-[11px] text-purple hover:underline"
        >
          Log today →
        </Link>
      </div>

      <DashboardChartsLoader data={series} />
    </main>
  );
}
