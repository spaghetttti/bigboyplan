import { requireAuth } from "@/lib/auth/require-auth";
import { toggleTaskCompletionForm } from "@/app/actions/tasks";
import { upsertJournalEntryForm } from "@/app/actions/journal";
import { ActivityHeatmapLoader } from "@/components/ActivityHeatmapLoader";
import { PlanTag } from "@/components/plan/PlanTag";
import { addDaysISO, todayISO } from "@/lib/dates";
import { aggregatesForHeatmap } from "@/lib/stats";
import { listTasksForDate, getCompletionsForDate } from "@/lib/tasks";
import { getJournalEntry } from "@/lib/journal";
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
  const userId = await requireAuth();

  const sp = await searchParams;
  const date = validDate(sp.date);
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);

  const [heatmapData, dayTasks, completedIds, journalEntry] = await Promise.all([
    aggregatesForHeatmap(userId, 365),
    listTasksForDate(userId, date),
    getCompletionsForDate(userId, date),
    getJournalEntry(userId, date),
    // ensure UserSettings row exists (no-op on repeated visits)
    prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  ]);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Calendar
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Heatmap + day details
      </h2>
      <p className="mt-2 text-sm text-muted2 ">
        Visualize activity trends and capture daily journal entries.
      </p>

      <div className="mt-6">
        <ActivityHeatmapLoader data={heatmapData} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted2 ">
          <Link href={`/calendar?date=${prev}`}>← Prev</Link>
          <form method="get" action="/calendar">
            <input type="date" name="date" defaultValue={date} />
          </form>
          <Link href={`/calendar?date=${next}`}>Next →</Link>
        </div>

        <h3 className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted2 ">
          {date}
        </h3>

        {/* Tasks for the day */}
        <ul className="mt-3 flex flex-col gap-2">
          {dayTasks.length === 0 ? (
            <li className="text-sm text-muted2 ">No tasks for this day.</li>
          ) : (
            dayTasks.map((task) => {
              const done = task.isRecurring
                ? completedIds.has(task.id)
                : task.completed;
              return (
                <li key={task.id} className="rounded-lg border border-border p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {task.taskTags.map((tt) => (
                        <PlanTag key={tt.categoryId} category={tt.category.name} />
                      ))}
                    </div>
                    <form
                      action={toggleTaskCompletionForm.bind(null, task.id, date)}
                    >
                      <button
                        type="submit"
                        className={`h-5 w-5 rounded border-2 ${
                          done ? "border-purple bg-purple/30" : "border-border2"
                        }`}
                      />
                    </form>
                  </div>
                  <p
                    className={
                      done ? "text-sm line-through text-muted2 " : "text-sm text-text"
                    }
                  >
                    {task.title}
                  </p>
                  {task.notes && (
                    <p className="mt-1 text-xs text-muted2 ">{task.notes}</p>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {/* Journal entry */}
        <form action={upsertJournalEntryForm} className="mt-4">
          <input type="hidden" name="date" value={date} />
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted2 ">
            Journal
          </label>
          <p className="mt-1 text-xs text-muted2 ">
            Use #hashtags to tag categories: #dsa #java #design #devops #review
          </p>
          <textarea
            name="content"
            defaultValue={journalEntry?.content ?? ""}
            rows={4}
            className="mt-2 w-full"
            placeholder="What did you work on today?"
          />
          <button
            type="submit"
            className="mt-2 rounded border border-border2 px-3 py-2 font-mono text-[11px] uppercase text-muted2  hover:border-purple hover:text-purple"
          >
            Save journal
          </button>
        </form>

        {journalEntry && journalEntry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {journalEntry.tags.map((t) => (
              <PlanTag key={t.categoryId} category={t.category.name} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
