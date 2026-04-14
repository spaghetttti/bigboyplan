type DayCell = {
  date: string;
  totalTasks: number;
  completedTasks: number;
  estimatedHours: number;
  score: number;
};

function level(score: number) {
  if (score <= 0) return "bg-[var(--heatmap-0)]";
  if (score <= 2) return "bg-[var(--heatmap-1)]";
  if (score <= 5) return "bg-[var(--heatmap-2)]";
  if (score <= 10) return "bg-[var(--heatmap-3)]";
  return "bg-[var(--heatmap-4)]";
}

export function CalendarHeatmap({ data }: { data: DayCell[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        Calendar heatmap
      </h3>
      <div className="mt-3 grid grid-cols-10 gap-1 sm:grid-cols-15 md:grid-cols-20 lg:grid-cols-30">
        {data.map((d) => (
          <div
            key={d.date}
            className={`h-3 w-3 rounded-sm ${level(d.score)}`}
            title={`${d.date} · ${d.completedTasks}/${d.totalTasks} done`}
          />
        ))}
      </div>
    </div>
  );
}

