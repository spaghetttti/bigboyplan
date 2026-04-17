const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthConsistencyGrid({
  checkIns,
  year,
  month,
}: {
  /** ISO date strings (YYYY-MM-DD) that have a check-in this month */
  checkIns: string[];
  /** Full year, e.g. 2026 */
  year: number;
  /** 1-based month, e.g. 4 for April */
  month: number;
}) {
  const checkedSet = new Set(checkIns);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Day of week of the 1st (0=Sun…6=Sat), convert to Mon-first offset (0=Mon…6=Sun)
  const rawFirstDay = new Date(year, month - 1, 1).getDay();
  const startOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;

  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }

  const totalCells = Math.ceil(cells.length / 7) * 7;
  while (cells.length < totalCells) cells.push({ day: null, iso: null });

  return (
    <div className="mt-3">
      <p className="mb-3 font-mono text-[11px] text-muted2">
        {MONTH_NAMES[month - 1]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-mono text-[9px] uppercase tracking-wider text-muted"
          >
            {label}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.day || !cell.iso) {
            return <div key={`empty-${i}`} className="h-7 w-full" />;
          }
          const done = checkedSet.has(cell.iso);
          const isToday = cell.iso === todayStr;
          return (
            <div
              key={cell.iso}
              title={cell.iso}
              className={`flex h-7 w-full items-center justify-center rounded text-[10px] font-mono transition-colors ${
                done
                  ? "bg-purple/80 text-white"
                  : isToday
                  ? "border border-purple/50 bg-surface2 text-purple"
                  : "border border-border bg-surface2 text-muted"
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted">
        {checkIns.length} / {daysInMonth} days checked in
      </p>
    </div>
  );
}
