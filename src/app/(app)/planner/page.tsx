import { requireAuth } from "@/lib/auth/require-auth";
import { addDaysISO, startOfWeekMondayISO, todayISO } from "@/lib/dates";
import { listTasksForWeek } from "@/lib/tasks";
import { getAllCategories } from "@/lib/categories";
import { WeeklyPlannerBoard } from "@/components/plan/WeeklyPlannerBoard";
import { ScheduledTaskForm } from "@/components/forms/ScheduledTaskForm";
import { RecurringTaskForm } from "@/components/forms/RecurringTaskForm";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const userId = await requireAuth();

  const weekStart = startOfWeekMondayISO(todayISO());
  const weekEnd = addDaysISO(weekStart, 6);

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

      <div className="mt-2 rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[11px] text-white">
          Week: {weekStart} → {weekEnd}
        </p>
      </div>

      <ScheduledTaskForm categories={categories} />

      <div className="mt-4">
        <WeeklyPlannerBoard
          weekStart={weekStart}
          weekEnd={weekEnd}
          tasks={weekTasks}
        />
      </div>

      {/* Recurring tasks section */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 ">
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
