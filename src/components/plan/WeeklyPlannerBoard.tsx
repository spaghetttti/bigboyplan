import type { PlanTask } from "@prisma/client";
import { togglePlanTaskCompletion } from "@/app/actions/plan";
import { PlanTag } from "@/components/plan/PlanTag";

const weekdayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklyPlannerBoard({
  weekTasks,
}: {
  weekTasks: PlanTask[];
}) {
  const byWeekday = new Map<number, PlanTask[]>();
  for (let i = 0; i < 7; i += 1) byWeekday.set(i, []);

  for (const task of weekTasks) {
    const [y, m, d] = task.date.split("-").map(Number);
    const day = new Date(y, m - 1, d).getDay();
    const list = byWeekday.get(day) ?? [];
    list.push(task);
    byWeekday.set(day, list);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from(byWeekday.entries()).map(([weekday, tasks]) => (
        <section
          key={weekday}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {weekdayLabel[weekday]}
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {tasks.length === 0 ? (
              <li className="text-xs text-muted2">No tasks</li>
            ) : (
              tasks.map((task) => (
                <li key={task.id} className="rounded-lg border border-border p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
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
                  <p
                    className={`text-sm ${
                      task.completed ? "text-muted line-through" : "text-text"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.detail ? (
                    <p className="mt-1 text-xs text-muted2">{task.detail}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

