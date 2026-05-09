import { requireAuth } from "@/lib/auth/require-auth";
import { addDaysISO, startOfWeekMondayISO, todayISO } from "@/lib/dates";
import { listTasksForWeek } from "@/lib/tasks";
import { getAllCategories } from "@/lib/categories";
import { WeeklyPlannerBoard } from "@/components/plan/WeeklyPlannerBoard";
import { ScheduledTaskForm } from "@/components/forms/ScheduledTaskForm";
import { RecurringTaskForm } from "@/components/forms/RecurringTaskForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const userId = await requireAuth();

  const sp = await searchParams;
  const currentWeekStart = startOfWeekMondayISO(todayISO());
  const weekStart = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week)
    ? startOfWeekMondayISO(sp.week)
    : currentWeekStart;
  const weekEnd = addDaysISO(weekStart, 6);
  const prevWeek = addDaysISO(weekStart, -7);
  const nextWeek = addDaysISO(weekStart, 7);
  const isCurrentWeek = weekStart === currentWeekStart;

  const [weekTasks, categories] = await Promise.all([
    listTasksForWeek(userId, weekStart, weekEnd),
    getAllCategories(userId),
  ]);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Weekly
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Planner
      </h2>
      <p className="mt-2 text-sm text-muted2 ">
        Schedule tasks for the week. Recurring tasks live in the Daily Checklist.
      </p>

      <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <Link
          href={`/planner?week=${prevWeek}`}
          className="font-mono text-[11px] text-muted2 hover:text-purple"
        >
          ← Prev
        </Link>
        <p className="flex-1 text-center font-mono text-[11px] text-white">
          {weekStart} → {weekEnd}
        </p>
        <Link
          href={`/planner?week=${nextWeek}`}
          className="font-mono text-[11px] text-muted2 hover:text-purple"
        >
          Next →
        </Link>
        {!isCurrentWeek && (
          <Link
            href="/planner"
            className="font-mono text-[10px] uppercase tracking-wider text-purple hover:underline"
          >
            This week
          </Link>
        )}
      </div>

      <ScheduledTaskForm categories={categories} />

      <div className="mt-4">
        <WeeklyPlannerBoard
          weekStart={weekStart}
          weekEnd={weekEnd}
          tasks={weekTasks}
          categories={categories}
        />
      </div>

      {/* Recurring tasks section */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
          Add recurring task
        </h3>
        <p className="mt-1 text-xs text-muted2 ">
          Recurring tasks appear every day in Today&apos;s checklist.
        </p>
        <RecurringTaskForm categories={categories} />
      </section>
    </main>
  );
}
