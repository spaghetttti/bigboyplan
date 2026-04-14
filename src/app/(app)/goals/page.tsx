import { addGoalForm, deleteGoal } from "@/app/actions/goals";
import { prisma } from "@/lib/db";
import { GOAL_CATEGORIES, tagClassForCategory } from "@/lib/tags";

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Plan
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">Goals</h2>
      <p className="mt-2 max-w-xl text-sm text-muted2">
        Tag goals like your static plan (DSA, Java, system design, DevOps). Use the
        Today page for daily execution.
      </p>

      <form
        action={addGoalForm}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-muted2">
          Title
          <input type="text" name="title" placeholder="e.g. Finish Java concurrency chapter" required />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted2">
          Category
          <select
            name="category"
            className="rounded-lg border border-border2 bg-surface2 px-3 py-2 text-sm text-text"
            defaultValue="DSA"
          >
            {GOAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
        >
          Add goal
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {goals.length === 0 ? (
          <li className="text-sm text-muted2">No goals yet.</li>
        ) : (
          goals.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tagClassForCategory(g.category)}`}
                >
                  {g.category}
                </span>
                <span className="text-sm text-text">{g.title}</span>
              </div>
              <form action={deleteGoal.bind(null, g.id)}>
                <button
                  type="submit"
                  className="font-mono text-[10px] uppercase tracking-wider text-coral hover:underline"
                >
                  Remove
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
