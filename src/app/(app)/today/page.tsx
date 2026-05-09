import Link from "next/link";
import { requireAuth } from "@/lib/auth/require-auth";
import { toggleTaskCompletionForm } from "@/app/actions/tasks";
import { prisma } from "@/lib/db";
import { JournalForm } from "@/components/forms/JournalForm";
import { LeetcodeForm } from "@/components/forms/LeetcodeForm";
import { addDaysISO, todayISO } from "@/lib/dates";
import { listTasksForDate, getCompletionsForDate } from "@/lib/tasks";
import { isoWeekFor, listWeeklyGoals } from "@/lib/weekly-goals";
import { getJournalEntry } from "@/lib/journal";
import { PlanTag } from "@/components/plan/PlanTag";
import { CheckInButton } from "@/components/CheckInButton";
import { tagClassForCategory } from "@/lib/tags";

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
  const userId = await requireAuth();

  const sp = await searchParams;
  const date = validDateOrToday(sp.date);
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);
  const today = todayISO();
  const { weekNumber, year } = isoWeekFor(date);

  const [tasks, completedIds, leet, weeklyGoals, journalEntry, checkIn] = await Promise.all([
    listTasksForDate(userId, date),
    getCompletionsForDate(userId, date),
    prisma.leetcodeLog.findUnique({ where: { userId_date: { userId, date } } }),
    listWeeklyGoals(userId, weekNumber, year),
    getJournalEntry(userId, date),
    date === today
      ? prisma.dailyCheckIn.findUnique({ where: { userId_date: { userId, date: today } } })
      : Promise.resolve(null),
  ]);

  const recurring = tasks.filter((t) => t.isRecurring);
  const scheduled = tasks.filter((t) => !t.isRecurring);

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Daily
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-text">Today</h2>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted2 ">
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
            <Link href="/today" className="ml-2 text-purple hover:underline">
              Jump to today
            </Link>
          ) : null}
        </div>
      </div>

      {date === today && <CheckInButton isCheckedIn={!!checkIn} />}

      {/* Recurring checklist */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 ">
          Daily checklist
        </h3>
        <ul className="mt-4 flex flex-col gap-3">
          {recurring.length === 0 ? (
            <li className="text-sm text-muted2 ">
              No recurring tasks — add one in the{" "}
              <Link href="/planner" className="text-purple hover:underline">
                Planner
              </Link>
              .
            </li>
          ) : (
            recurring.map((t) => {
              const done = completedIds.has(t.id);
              return (
                <li key={t.id} className="flex items-start gap-3">
                  <form
                    action={toggleTaskCompletionForm.bind(null, t.id, date)}
                    className="pt-0.5"
                  >
                    <button
                      type="submit"
                      aria-pressed={done}
                      className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                        done
                          ? "border-purple bg-purple/30"
                          : "border-border2 hover:border-muted2"
                      }`}
                      title={done ? "Mark incomplete" : "Mark done"}
                    />
                  </form>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={`text-sm leading-relaxed ${
                        done ? "text-muted2 line-through" : "text-text"
                      }`}
                    >
                      {t.title}
                    </span>
                    {t.taskTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.taskTags.map((tt) => (
                          <PlanTag key={tt.categoryId} category={tt.category.name} />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Scheduled tasks for the day */}
      {scheduled.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 ">
            Scheduled for today
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {scheduled.map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <form
                  action={toggleTaskCompletionForm.bind(null, t.id, date)}
                  className="pt-0.5"
                >
                  <button
                    type="submit"
                    aria-pressed={t.completed}
                    className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                      t.completed
                        ? "border-purple bg-purple/30"
                        : "border-border2 hover:border-muted2"
                    }`}
                  />
                </form>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-sm ${
                      t.completed ? "text-muted2 line-through" : "text-text"
                    }`}
                  >
                    {t.title}
                  </span>
                  {t.taskTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.taskTags.map((tt) => (
                        <PlanTag key={tt.categoryId} category={tt.category.name} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Journal */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 ">
          Journal
        </h3>
        <p className="mt-1 text-xs text-muted2 ">
          Use #hashtags to tag categories: #dsa #java #design #devops #review
        </p>
        <JournalForm date={date} defaultContent={journalEntry?.content} exists={!!journalEntry} />
        {journalEntry && journalEntry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {journalEntry.tags.map((t) => (
              <PlanTag key={t.categoryId} category={t.category.name} />
            ))}
          </div>
        )}
      </section>

      {/* LeetCode log */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 ">
          LeetCode (manual)
        </h3>
        <LeetcodeForm
          date={date}
          easyCount={leet?.easyCount}
          mediumCount={leet?.mediumCount}
          hardCount={leet?.hardCount}
          notes={leet?.notes}
          exists={!!leet}
        />
      </section>

      {/* Weekly goals sidebar */}
      {weeklyGoals.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 ">
            This week's goals
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {weeklyGoals.map((g) => {
              const pct =
                g.targetValue > 0
                  ? Math.min(100, Math.round((g.actualValue / g.targetValue) * 100))
                  : 0;
              return (
                <li key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-text">{g.title}</span>
                    <span className="font-mono text-[10px] text-muted2 ">
                      {g.actualValue}/{g.targetValue} {g.metricUnit}
                    </span>
                  </div>
                  {g.category && (
                    <span
                      className={`inline-block w-fit rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${tagClassForCategory(g.category.name)}`}
                    >
                      {g.category.name}
                    </span>
                  )}
                  <div className="h-1.5 w-full rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-purple transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/goals"
            className="mt-4 inline-block font-mono text-[11px] text-purple hover:underline"
          >
            Manage weekly goals →
          </Link>
        </section>
      )}
    </main>
  );
}
