import { requireAuth } from "@/lib/auth/require-auth";
import { addTaskForm } from "@/app/actions/tasks";
import { addDaysISO, startOfWeekMondayISO, todayISO } from "@/lib/dates";
import { listTasksForWeek } from "@/lib/tasks";
import { getAllCategories } from "@/lib/categories";
import { WeeklyPlannerBoard } from "@/components/plan/WeeklyPlannerBoard";
import { MultiTagPicker } from "@/components/MultiTagPicker";

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

      <form
        action={addTaskForm}
        className="mt-4 grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input type="hidden" name="isRecurring" value="" />
        <input type="date" name="dueDate" defaultValue={todayISO()} required />
        <input type="text" name="title" placeholder="Task title" required className="lg:col-span-2" />
        <MultiTagPicker categories={categories} name="categoryIds" />
        <button
          type="submit"
          className="rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2  hover:border-purple hover:text-purple"
        >
          Add task
        </button>
      </form>

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
        <form action={addTaskForm} className="mt-4 flex flex-wrap gap-2 items-end">
          <input type="hidden" name="isRecurring" value="on" />
          <label className="flex flex-col gap-1 text-xs text-muted2 ">
            Title
            <input type="text" name="title" placeholder="e.g. Morning review" required className="w-48" />
          </label>
          <div className="flex flex-col gap-1 text-xs text-muted2 ">
            Category
            <MultiTagPicker categories={categories} name="categoryIds" />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2  transition-colors hover:border-purple hover:text-purple"
          >
            Add recurring
          </button>
        </form>
      </section>
    </main>
  );
}
