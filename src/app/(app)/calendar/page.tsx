import { auth } from "@/auth";
import { togglePlanTaskCompletion, upsertDailyNote } from "@/app/actions/plan";
import { CalendarHeatmap } from "@/components/plan/CalendarHeatmap";
import { PlanTag } from "@/components/plan/PlanTag";
import { addDaysISO, todayISO } from "@/lib/dates";
import {
  ensureSeededPlanForUser,
  generateTasksFromTemplates,
  getHeatmapData,
} from "@/lib/plan/service";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function validDate(s: string | undefined) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return todayISO();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = validDate(sp.date);
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);
  const session = await auth();
  const plan = await ensureSeededPlanForUser(session?.user?.id);
  await generateTasksFromTemplates(plan.id, addDaysISO(todayISO(), -45), addDaysISO(todayISO(), 30));

  const [heatmap, dayTasks, note] = await Promise.all([
    getHeatmapData(plan.id, 120),
    prisma.planTask.findMany({
      where: { planId: plan.id, date },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailyNote.findUnique({ where: { planId_date: { planId: plan.id, date } } }),
  ]);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Calendar
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Heatmap + day details
      </h2>
      <p className="mt-2 text-sm text-muted2">
        Visualize completion trends and capture daily notes.
      </p>

      <div className="mt-6">
        <CalendarHeatmap data={heatmap} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted2">
          <Link href={`/calendar?date=${prev}`}>← Prev</Link>
          <form method="get" action="/calendar">
            <input type="date" name="date" defaultValue={date} />
          </form>
          <Link href={`/calendar?date=${next}`}>Next →</Link>
        </div>

        <h3 className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {date}
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {dayTasks.length === 0 ? (
            <li className="text-sm text-muted2">No tasks for this day.</li>
          ) : (
            dayTasks.map((task) => (
              <li key={task.id} className="rounded-lg border border-border p-2">
                <div className="mb-1 flex items-center justify-between">
                  <PlanTag category={task.category} />
                  <form action={togglePlanTaskCompletion.bind(null, task.id)}>
                    <button
                      type="submit"
                      className={`h-5 w-5 rounded border-2 ${
                        task.completed
                          ? "border-purple bg-purple/30"
                          : "border-border2"
                      }`}
                    />
                  </form>
                </div>
                <p className={task.completed ? "text-sm line-through text-muted" : "text-sm text-text"}>
                  {task.title}
                </p>
                {task.detail ? (
                  <p className="mt-1 text-xs text-muted2">{task.detail}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <form action={upsertDailyNote} className="mt-4">
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="date" value={date} />
          <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Daily note
          </label>
          <textarea
            name="content"
            defaultValue={note?.content ?? ""}
            rows={4}
            className="mt-2 w-full"
            placeholder="What did you work on today?"
          />
          <button
            type="submit"
            className="mt-2 rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2 hover:border-purple hover:text-purple"
          >
            Save note
          </button>
        </form>
      </section>
    </main>
  );
}

