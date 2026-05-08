"use client";
import { useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";
import type { HeatmapDay, HeatmapDayMeta } from "@/lib/stats";

type Props = { data: HeatmapDay[] };

function TooltipCard({ date, meta }: { date: string; meta: HeatmapDayMeta }) {
  const totalTasks = meta.recurringCompletions + meta.scheduledTasksDone;
  const hasLeetBreakdown = meta.leetcodeEasy > 0 || meta.leetcodeMedium > 0 || meta.leetcodeHard > 0;

  return (
    <div className="min-w-[170px] space-y-1.5 py-0.5">
      <div className="border-b border-white/10 pb-1.5 font-mono text-[11px] font-semibold text-text">
        {date}
      </div>
      <div className="space-y-1 text-[10px]">
        <div className={meta.checkedIn ? "text-emerald-400" : "text-muted2"}>
          {meta.checkedIn ? "✓" : "✗"} Check-in
        </div>
        {meta.leetcode > 0 ? (
          <div className="text-yellow-400">
            ⌨ {meta.leetcode} LeetCode
            {hasLeetBreakdown && (
              <span className="ml-1 text-muted2">
                ({meta.leetcodeEasy}E · {meta.leetcodeMedium}M · {meta.leetcodeHard}H)
              </span>
            )}
          </div>
        ) : (
          <div className="text-muted2">⌨ No LeetCode</div>
        )}
        {meta.github > 0 ? (
          <div className="text-blue-400">⚡ {meta.github} GitHub commit{meta.github !== 1 ? "s" : ""}</div>
        ) : (
          <div className="text-muted2">⚡ No GitHub activity</div>
        )}
        {totalTasks > 0 ? (
          <div className="text-purple">
            ✓ {totalTasks} task{totalTasks !== 1 ? "s" : ""}
            {meta.recurringCompletions > 0 && meta.scheduledTasksDone > 0 && (
              <span className="ml-1 text-muted2">
                ({meta.recurringCompletions}R · {meta.scheduledTasksDone}S)
              </span>
            )}
          </div>
        ) : (
          <div className="text-muted2">✗ No tasks</div>
        )}
        {meta.journaled ? (
          <div className="text-orange-400">✎ Journaled</div>
        ) : (
          <div className="text-muted2">✗ No journal</div>
        )}
      </div>
    </div>
  );
}

export function ActivityHeatmap({ data }: Props) {
  const metaMap = useMemo(
    () => new Map(data.map((d) => [d.date, d.meta])),
    [data]
  );

  const classForValue = (v: Record<string, unknown> | undefined) => {
    if (!v || !("count" in v)) return "color-empty";
    const count = (v.count as number) ?? 0;
    if (count === 0) return "color-empty";
    if (count <= 2) return "color-github-1";
    if (count <= 5) return "color-github-2";
    if (count <= 9) return "color-github-3";
    return "color-github-4";
  };

  if (!data || data.length === 0) {
    return <div className="text-muted2  text-sm">No data available</div>;
  }

  const startDate = new Date(data[0].date);
  const endDate = new Date(data[data.length - 1].date);

  return (
    <>
      <div className="overflow-x-auto rounded border border-border p-2 bg-surface/50">
        <CalendarHeatmap
          values={data}
          startDate={startDate}
          endDate={endDate}
          classForValue={classForValue}
          showWeekdayLabels
          showMonthLabels
          gutterSize={2}
          tooltipDataAttrs={(v) => ({
            "data-tooltip-id": "heatmap-tooltip",
            "data-tooltip-content": v?.date ?? "",
            "data-tooltip-place": "top",
          }) as Record<string, string>}
        />
      </div>
      <Tooltip
        id="heatmap-tooltip"
        className="bg-surface! text-text! text-[11px]! border! border-border! rounded-lg! p-2!"
        render={({ content }) => {
          const date = typeof content === "string" ? content : String(content ?? "");
          if (!date) return null;
          const meta = metaMap.get(date);
          if (!meta) return <span className="font-mono text-[11px]">{date}</span>;
          return <TooltipCard date={date} meta={meta} />;
        }}
      />
    </>
  );
}
