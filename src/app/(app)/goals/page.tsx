import { requireAuth } from "@/lib/auth/require-auth";
import {
  addWeeklyGoalForm,
  deleteWeeklyGoalAction,
  updateWeeklyGoalProgressForm,
} from "@/app/actions/weekly-goals";
import { getAllCategories } from "@/lib/categories";
import { isoWeekFor, listWeeklyGoals } from "@/lib/weekly-goals";
import { todayISO, addDaysISO, startOfWeekMondayISO } from "@/lib/dates";
import { tagClassForCategory } from "@/lib/tags";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "✓ Done",
  MISSED: "Missed",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-muted2 ",
  IN_PROGRESS: "text-amber",
  COMPLETED: "text-green",
  MISSED: "text-coral",
};

export default async function GoalsPage() {
  const userId = await requireAuth();

  const today = todayISO();
  const { weekNumber, year } = isoWeekFor(today);
  const weekStart = startOfWeekMondayISO(today);
  const weekEnd = addDaysISO(weekStart, 6);

  const [categories, goals] = await Promise.all([
    getAllCategories(userId),
    listWeeklyGoals(userId, weekNumber, year),
  ]);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Plan
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Weekly Goals
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted2 ">
        Week {weekNumber} · {weekStart} → {weekEnd}. Set measurable targets and track progress.
      </p>

      {/* Add goal form */}
      <form
        action={addWeeklyGoalForm}
        className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input type="hidden" name="weekDate" value={today} />
        <label className="flex flex-col gap-1 text-xs text-muted2  lg:col-span-2">
          Goal title
          <input
            type="text"
            name="title"
            placeholder="e.g. Solve 10 LeetCode problems"
            required
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted2 ">
          Category
          <select
            name="categoryId"
            className="rounded-lg border border-border2 bg-surface2 px-3 py-2 text-sm text-text"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted2 ">
          Target value
          <input
            type="number"
            name="targetValue"
            min={0}
            defaultValue={1}
            className="w-full"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted2 ">
          Metric unit
          <input
            type="text"
            name="metricUnit"
            placeholder="problems, commits, articles…"
            defaultValue="items"
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted2 ">
          Description (optional)
          <input
            type="text"
            name="description"
            placeholder="Optional detail"
            className="w-full"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2  transition-colors hover:border-purple hover:text-purple lg:col-span-3"
        >
          Add goal
        </button>
      </form>

      {/* Goals list */}
      <ul className="mt-8 flex flex-col gap-3">
        {goals.length === 0 ? (
          <li className="text-sm text-muted2 ">No goals this week yet.</li>
        ) : (
          goals.map((g) => {
            const pct =
              g.targetValue > 0
                ? Math.min(100, Math.round((g.actualValue / g.targetValue) * 100))
                : 0;
            return (
              <li
                key={g.id}
                className="rounded-xl border border-border bg-surface px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {g.category && (
                        <span
                          className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tagClassForCategory(g.category.name)}`}
                        >
                          {g.category.name}
                        </span>
                      )}
                      <span className="text-sm font-medium text-text">{g.title}</span>
                    </div>
                    {g.description && (
                      <p className="text-xs text-muted2 ">{g.description}</p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[11px] ${STATUS_CLASS[g.status] ?? "text-muted2 "}`}
                  >
                    {STATUS_LABEL[g.status] ?? g.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between font-mono text-[10px] text-muted2 ">
                    <span>
                      {g.actualValue} / {g.targetValue} {g.metricUnit}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-purple transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Update progress */}
                <form
                  action={updateWeeklyGoalProgressForm.bind(null, g.id)}
                  className="mt-3 flex items-end gap-2"
                >
                  <label className="flex flex-col gap-1 text-xs text-muted2 ">
                    Update progress
                    <input
                      type="number"
                      name="actualValue"
                      min={0}
                      defaultValue={g.actualValue}
                      className="w-24"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded border border-border2 px-3 py-2 font-mono text-[10px] uppercase text-muted2  hover:border-purple hover:text-purple"
                  >
                    Save
                  </button>
                </form>

                {/* Delete */}
                <form
                  action={deleteWeeklyGoalAction.bind(null, g.id)}
                  className="mt-2"
                >
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase text-coral hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
