import { auth } from "@/auth";
import {
  addManualPlanTask,
  generateCurrentWeekTasksAction,
} from "@/app/actions/plan";
import { WeeklyPlannerBoard } from "@/components/plan/WeeklyPlannerBoard";
import { addDaysISO, startOfWeekMondayISO, todayISO } from "@/lib/dates";
import {
  ensureSeededPlanForUser,
  generateTasksFromTemplates,
  getWeekTasks,
} from "@/lib/plan/service";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const session = await auth();
  const plan = await ensureSeededPlanForUser(session?.user?.id);
  const weekStart = startOfWeekMondayISO(todayISO());
  const weekEnd = addDaysISO(weekStart, 6);
  await generateTasksFromTemplates(plan.id, weekStart, weekEnd);
  const week = await getWeekTasks(plan.id, todayISO());

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Weekly
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Planner board
      </h2>
      <p className="mt-2 text-sm text-muted2">
        Tasks are generated from your monthly templates and can be edited with
        manual entries.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[11px] text-muted">
          Week: {week.weekStart} → {week.weekEnd}
        </p>
        <form action={generateCurrentWeekTasksAction} className="mt-2">
          <button
            type="submit"
            className="rounded border border-border2 px-3 py-1 font-mono text-[11px] uppercase text-muted2 hover:border-purple hover:text-purple"
          >
            Regenerate this week
          </button>
        </form>
      </div>

      <form
        action={addManualPlanTask}
        className="mt-4 grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input type="hidden" name="planId" value={plan.id} />
        <input type="date" name="date" defaultValue={todayISO()} required />
        <input type="text" name="title" placeholder="Manual task title" required />
        <select
          name="category"
          className="rounded-lg border border-border2 bg-surface2 px-3 py-2 text-sm text-text"
          defaultValue="REVIEW"
        >
          <option value="DSA">DSA</option>
          <option value="JAVA">JAVA</option>
          <option value="DESIGN">DESIGN</option>
          <option value="DEVOPS">DEVOPS</option>
          <option value="REVIEW">REVIEW</option>
          <option value="MOCK">MOCK</option>
        </select>
        <input
          type="number"
          name="estimatedHours"
          min={0}
          step="0.5"
          placeholder="Hours"
        />
        <input type="text" name="detail" placeholder="Optional detail" />
        <button
          type="submit"
          className="rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2 hover:border-purple hover:text-purple"
        >
          Add task
        </button>
      </form>

      <div className="mt-4">
        <WeeklyPlannerBoard weekTasks={week.tasks} />
      </div>
    </main>
  );
}

