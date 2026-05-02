"use client";

import { toggleTaskCompletionForm } from "@/app/actions/tasks";
import { PlanTag } from "@/components/plan/PlanTag";
import type { TaskWithTags } from "@/lib/tasks";

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

function dateToWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function WeeklyPlannerBoard({
  weekStart,
  weekEnd,
  tasks,
}: {
  weekStart: string;
  weekEnd: string;
  tasks: TaskWithTags[];
}) {
  // Build weekday → ISO date map for the current week
  const weekdayToDate = new Map<number, string>();
  {
    const [sy, sm, sd] = weekStart.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      weekdayToDate.set(d.getDay(), iso);
    }
  }

  const byWeekday = new Map<number, TaskWithTags[]>();
  for (let i = 0; i < 7; i++) byWeekday.set(i, []);

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const day = dateToWeekday(task.dueDate);
    byWeekday.get(day)!.push(task);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {MON_FIRST.map((weekday) => {
        const dayTasks = byWeekday.get(weekday) ?? [];
        const colDate = weekdayToDate.get(weekday) ?? "";
        return (
          <section
            key={weekday}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted2 ">
              {WEEKDAY_LABEL[weekday]}
              {colDate && (
                <span className="ml-1 normal-case text-[9px] text-muted2 ">
                  {colDate.slice(5)}
                </span>
              )}
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {dayTasks.length === 0 ? (
                <li className="text-xs text-muted2 ">No tasks</li>
              ) : (
                dayTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border border-border p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      {task.taskTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.taskTags.map((tt) => (
                            <PlanTag key={tt.categoryId} category={tt.category.name} />
                          ))}
                        </div>
                      ) : (
                        <span />
                      )}
                      <form action={toggleTaskCompletionForm.bind(null, task.id, task.dueDate ?? "")}>
                        <button
                          type="submit"
                          className={`h-5 w-5 rounded border-2 ${
                            task.completed ? "border-purple bg-purple/30" : "border-border2"
                          }`}
                        />
                      </form>
                    </div>
                    <p className="mb-1 font-mono text-[11px] text-muted2 ">{task.dueDate}</p>
                    <p
                      className={`text-sm ${
                        task.completed ? "text-muted2 line-through" : "text-text"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.notes && (
                      <p className="mt-1 text-xs text-muted2 ">{task.notes}</p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
