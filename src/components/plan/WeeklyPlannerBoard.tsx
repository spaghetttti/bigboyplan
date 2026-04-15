import type { PlanTask } from "@prisma/client";
import { togglePlanTaskCompletion } from "@/app/actions/plan";
import { updatePlanTask } from "@/app/actions/plan";
import { PlanTag } from "@/components/plan/PlanTag";

const weekdayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0];

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
      {mondayFirstOrder.map((weekday) => {
        const tasks = byWeekday.get(weekday) ?? [];
        return (
        <section
          key={weekday}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted">
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
                  <p className="mb-1 text-[11px] text-muted2">{task.date}</p>
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
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted2 hover:text-purple">
                      Edit task
                    </summary>
                    <form
                      action={updatePlanTask}
                      className="mt-2 grid gap-2 rounded border border-border2 p-2"
                    >
                      <input type="hidden" name="taskId" value={task.id} />
                      <input
                        type="date"
                        name="date"
                        defaultValue={task.date}
                        required
                        className="rounded border border-border2 bg-surface2 px-2 py-1 text-xs text-text"
                      />
                      <input
                        type="text"
                        name="title"
                        defaultValue={task.title}
                        required
                        className="rounded border border-border2 bg-surface2 px-2 py-1 text-xs text-text"
                      />
                      <input
                        type="text"
                        name="detail"
                        defaultValue={task.detail ?? ""}
                        placeholder="Optional detail"
                        className="rounded border border-border2 bg-surface2 px-2 py-1 text-xs text-text"
                      />
                      <select
                        name="category"
                        defaultValue={task.category}
                        className="rounded border border-border2 bg-surface2 px-2 py-1 text-xs text-text"
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
                        defaultValue={task.estimatedHours ?? ""}
                        placeholder="Hours"
                        className="rounded border border-border2 bg-surface2 px-2 py-1 text-xs text-text"
                      />
                      <button
                        type="submit"
                        className="rounded border border-border2 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted2 hover:border-purple hover:text-purple"
                      >
                        Save
                      </button>
                    </form>
                  </details>
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

