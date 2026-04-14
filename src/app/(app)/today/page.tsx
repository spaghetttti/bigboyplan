import Link from "next/link";
import { auth } from "@/auth";
import { togglePlanTaskCompletion, upsertDailyNote } from "@/app/actions/plan";
import { addDailyTaskForm, toggleTaskCompletion } from "@/app/actions/tasks";
import { upsertLeetcodeForm } from "@/app/actions/leetcode";
import { prisma } from "@/lib/db";
import { addDaysISO, todayISO } from "@/lib/dates";
import { tagClassForCategory } from "@/lib/tags";
import { ensureSeededPlanForUser, generateTasksFromTemplates } from "@/lib/plan/service";
import { PlanTag } from "@/components/plan/PlanTag";
import { extractGoalMentionsFromNote } from "@/lib/plan/note-tags";

export const dynamic = "force-dynamic";

function validDateOrToday(s: string | undefined): string {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return todayISO();
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = validDateOrToday(sp.date);
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);
  const today = todayISO();
  const session = await auth();
  const plan = await ensureSeededPlanForUser(session?.user?.id);
  await generateTasksFromTemplates(plan.id, addDaysISO(date, -1), addDaysISO(date, 1));

  const [tasks, completions, leet, goals, planTasks, planNote] = await Promise.all([
    prisma.dailyTask.findMany({
      where: { archived: false },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.taskCompletion.findMany({ where: { date } }),
    prisma.leetcodeLog.findUnique({ where: { date } }),
    prisma.goal.findMany({ orderBy: { sortOrder: "asc" }, take: 8 }),
    prisma.planTask.findMany({
      where: { planId: plan.id, date },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailyNote.findUnique({
      where: { planId_date: { planId: plan.id, date } },
    }),
  ]);

  const done = new Set(completions.map((c) => c.taskId));
  const noteMentions = extractGoalMentionsFromNote(planNote?.content ?? "");

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Daily
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-text">Today</h2>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted2">
          <Link
            href={`/today?date=${prev}`}
            className="rounded border border-border2 px-2 py-1 hover:border-purple hover:text-purple"
          >
            ← Prev
          </Link>
          <form method="get" action="/today" className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={date} className="font-mono text-xs" />
            <button
              type="submit"
              className="rounded border border-border2 px-2 py-1 hover:border-purple hover:text-purple"
            >
              Go
            </button>
          </form>
          <Link
            href={`/today?date=${next}`}
            className="rounded border border-border2 px-2 py-1 hover:border-purple hover:text-purple"
          >
            Next →
          </Link>
          {date !== today ? (
            <Link
              href="/today"
              className="ml-2 text-purple hover:underline"
            >
              Jump to today
            </Link>
          ) : null}
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Checklist
        </h3>
        <ul className="mt-4 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <li className="text-sm text-muted2">No tasks yet — add one below.</li>
          ) : (
            tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <form
                  action={toggleTaskCompletion.bind(null, t.id, date)}
                  className="pt-0.5"
                >
                  <button
                    type="submit"
                    aria-pressed={done.has(t.id)}
                    className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                      done.has(t.id)
                        ? "border-purple bg-purple/30"
                        : "border-border2 hover:border-muted2"
                    }`}
                    title={done.has(t.id) ? "Mark incomplete" : "Mark done"}
                  />
                </form>
                <span
                  className={`text-sm leading-relaxed ${
                    done.has(t.id) ? "text-muted line-through" : "text-text"
                  }`}
                >
                  {t.title}
                </span>
              </li>
            ))
          )}
        </ul>

        <form action={addDailyTaskForm} className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6">
          <input
            type="text"
            name="title"
            placeholder="New daily task"
            className="min-w-[200px] flex-1"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
          >
            Add task
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Plan day details
        </h3>
        <ul className="mt-3 flex gap-2">
          {planTasks.length === 0 ? (
            <li className="text-sm text-muted2">No seeded plan tasks for this day.</li>
          ) : (
            planTasks.map((task) => (
              <li key={task.id} className="rounded border border-border p-2">
                <div className="mb-1 flex-row items-center justify-between">
                  <PlanTag category={task.category} />
                </div>
              </li>
            ))
          )}
        </ul>
        <form action={upsertDailyNote} className="mt-4">
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="date" value={date} />
          <p className="mb-1 text-xs text-muted2">
            Add goal hashtags in note: #dsa #java #design #devops #review
          </p>
          <textarea
            name="content"
            rows={3}
            className="w-full"
            placeholder="What did you work on today?"
            defaultValue={planNote?.content ?? ""}
          />
          <button
            type="submit"
            className="mt-2 rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
          >
            Save day note
          </button>
        </form>
        {noteMentions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {noteMentions.map((tag) => (
              <PlanTag key={tag} category={tag} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          LeetCode (manual)
        </h3>
        <form action={upsertLeetcodeForm} className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-xs text-muted2">
            Date
            <input type="date" name="date" defaultValue={date} required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted2">
            Problems solved
            <input
              type="number"
              name="count"
              min={0}
              defaultValue={leet?.count ?? 0}
              className="w-28"
            />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-muted2">
            Notes
            <input
              type="text"
              name="notes"
              placeholder="Optional"
              defaultValue={leet?.notes ?? ""}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-border2 bg-surface2 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
          >
            Save log
          </button>
        </form>
      </section>

      {goals.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Goals snapshot
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            {goals.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-2 text-sm text-muted2">
                <span
                  className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tagClassForCategory(g.category)}`}
                >
                  {g.category}
                </span>
                <span className="text-text">{g.title}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/goals"
            className="mt-4 inline-block font-mono text-[11px] text-purple hover:underline"
          >
            Manage goals →
          </Link>
        </section>
      ) : null}
    </main>
  );
}
