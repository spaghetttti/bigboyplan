import { requireAuth } from "@/lib/auth/require-auth";
import { toggleTaskCompletionForm } from "@/app/actions/tasks";
import { ActivityHeatmapLoader } from "@/components/ActivityHeatmapLoader";
import { JournalForm } from "@/components/forms/JournalForm";
import { PlanTag } from "@/components/plan/PlanTag";
import { addDaysISO, todayISO } from "@/lib/dates";
import { aggregatesForHeatmap } from "@/lib/stats";
import { listTasksForDate, getCompletionsForDate } from "@/lib/tasks";
import { getJournalEntry, listJournalEntriesPaginated } from "@/lib/journal";
import { listLeetcodeLogsPaginated } from "@/lib/leetcode";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const JOURNAL_PAGE_SIZE = 5;
const LC_PAGE_SIZE = 10;

function validDate(s: string | undefined) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return todayISO();
}

function validPage(s: string | undefined): number {
  const n = parseInt(s ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function pageUrl(
  date: string,
  journalPage: number,
  lcPage: number,
): string {
  return `/calendar?date=${date}&journalPage=${journalPage}&lcPage=${lcPage}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; journalPage?: string; lcPage?: string }>;
}) {
  const userId = await requireAuth();

  const sp = await searchParams;
  const date = validDate(sp.date);
  const journalPage = validPage(sp.journalPage);
  const lcPage = validPage(sp.lcPage);
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);

  const [
    heatmapData,
    dayTasks,
    completedIds,
    journalEntry,
    journalHistory,
    leetcodeHistory,
  ] = await Promise.all([
    aggregatesForHeatmap(userId, 365),
    listTasksForDate(userId, date),
    getCompletionsForDate(userId, date),
    getJournalEntry(userId, date),
    listJournalEntriesPaginated(userId, journalPage, JOURNAL_PAGE_SIZE),
    listLeetcodeLogsPaginated(userId, lcPage, LC_PAGE_SIZE),
    // ensure UserSettings row exists (no-op on repeated visits)
    prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  ]);

  const journalTotalPages = Math.max(1, Math.ceil(journalHistory.total / JOURNAL_PAGE_SIZE));
  const lcTotalPages = Math.max(1, Math.ceil(leetcodeHistory.total / LC_PAGE_SIZE));

  return (
    <main>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple">
        Calendar
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
        Heatmap + day details
      </h2>
      <p className="mt-2 text-sm text-muted2">
        Visualize activity trends and capture daily journal entries.
      </p>

      <div className="mt-6">
        <ActivityHeatmapLoader data={heatmapData} />
      </div>

      {/* ── Day detail ── */}
      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted2">
          <Link href={`/calendar?date=${prev}&journalPage=${journalPage}&lcPage=${lcPage}`}>← Prev</Link>
          <form method="get" action="/calendar">
            <input type="hidden" name="journalPage" value={journalPage} />
            <input type="hidden" name="lcPage" value={lcPage} />
            <input type="date" name="date" defaultValue={date} />
          </form>
          <Link href={`/calendar?date=${next}&journalPage=${journalPage}&lcPage=${lcPage}`}>Next →</Link>
        </div>

        <h3 className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted2">
          {date}
        </h3>

        {/* Tasks for the day */}
        <ul className="mt-3 flex flex-col gap-2">
          {dayTasks.length === 0 ? (
            <li className="text-sm text-muted2">No tasks for this day.</li>
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
                    <form action={toggleTaskCompletionForm.bind(null, task.id, date)}>
                      <button
                        type="submit"
                        className={`h-5 w-5 rounded border-2 ${
                          done ? "border-purple bg-purple/30" : "border-border2"
                        }`}
                      />
                    </form>
                  </div>
                  <p className={done ? "text-sm line-through text-muted2" : "text-sm text-text"}>
                    {task.title}
                  </p>
                  {task.notes && (
                    <p className="mt-1 text-xs text-muted2">{task.notes}</p>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {/* Journal entry editor */}
        <div className="mt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted2">
            Journal
          </label>
          <p className="mt-1 text-xs text-muted2">
            Use #hashtags to tag categories: #dsa #java #design #devops #review
          </p>
          <JournalForm date={date} defaultContent={journalEntry?.content} />
        </div>

        {journalEntry && journalEntry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {journalEntry.tags.map((t) => (
              <PlanTag key={t.categoryId} category={t.category.name} />
            ))}
          </div>
        )}
      </section>

      {/* ── Journal History ── */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2">
              Journal History
            </h3>
            <p className="mt-1 text-xs text-muted2">
              {journalHistory.total} {journalHistory.total === 1 ? "entry" : "entries"} total
            </p>
          </div>
          {journalHistory.total > 0 && (
            <a
              href="/api/export/journal"
              className="rounded border border-border2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted2 transition-colors hover:border-purple hover:text-purple"
            >
              ↓ Export .md
            </a>
          )}
        </div>

        {journalHistory.entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted2">No journal entries yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {journalHistory.entries.map((entry) => {
              const preview =
                entry.content.length > 200
                  ? entry.content.slice(0, 200).trimEnd() + "…"
                  : entry.content;
              return (
                <li
                  key={entry.id}
                  className="rounded-lg border border-border p-6"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/calendar?date=${entry.date}&journalPage=${journalPage}&lcPage=${lcPage}`}
                      className="font-mono text-[11px] text-purple hover:underline"
                    >
                      {entry.date}
                    </Link>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {entry.tags.map((t) => (
                          <PlanTag key={t.categoryId} category={t.category.name} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted2 leading-relaxed">
                    {preview}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {/* Journal pagination */}
        {journalTotalPages > 1 && (
          <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-muted2">
            {journalPage > 1 && (
              <Link href={pageUrl(date, journalPage - 1, lcPage)} className="hover:text-purple">
                ← Newer
              </Link>
            )}
            <span>
              Page {journalPage} / {journalTotalPages}
            </span>
            {journalPage < journalTotalPages && (
              <Link href={pageUrl(date, journalPage + 1, lcPage)} className="hover:text-purple">
                Older →
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ── LeetCode History ── */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2">
              LeetCode Log History
            </h3>
            <p className="mt-1 text-xs text-muted2">
              {leetcodeHistory.total} {leetcodeHistory.total === 1 ? "entry" : "entries"} total
            </p>
          </div>
          {leetcodeHistory.total > 0 && (
            <a
              href="/api/export/leetcode"
              className="rounded border border-border2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted2 transition-colors hover:border-teal hover:text-teal"
            >
              ↓ Export .md
            </a>
          )}
        </div>

        {leetcodeHistory.logs.length === 0 ? (
          <p className="mt-4 text-sm text-muted2">No LeetCode logs yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {leetcodeHistory.logs.map((log) => {
              const total = log.easyCount + log.mediumCount + log.hardCount;
              const parts = [
                log.easyCount > 0 ? `${log.easyCount} easy` : null,
                log.mediumCount > 0 ? `${log.mediumCount} medium` : null,
                log.hardCount > 0 ? `${log.hardCount} hard` : null,
              ].filter(Boolean);

              return (
                <li
                  key={log.id}
                  className="rounded-lg border border-border p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-purple">
                      {log.date}
                    </span>
                    <span className="font-mono text-[11px] text-text">
                      {total} solved
                      {parts.length > 0 && (
                        <span className="ml-1 text-muted2">
                          ({parts.join(", ")})
                        </span>
                      )}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-muted2 leading-relaxed">
                      {log.notes.length > 200
                        ? log.notes.slice(0, 200).trimEnd() + "…"
                        : log.notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* LeetCode pagination */}
        {lcTotalPages > 1 && (
          <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-muted2">
            {lcPage > 1 && (
              <Link href={pageUrl(date, journalPage, lcPage - 1)} className="hover:text-teal">
                ← Newer
              </Link>
            )}
            <span>
              Page {lcPage} / {lcTotalPages}
            </span>
            {lcPage < lcTotalPages && (
              <Link href={pageUrl(date, journalPage, lcPage + 1)} className="hover:text-teal">
                Older →
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
