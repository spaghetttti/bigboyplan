"use client";
import { useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";
import type { HeatmapDay } from "@/lib/stats";

type Props = { data: HeatmapDay[] };

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

  const tooltipContent = (v: CalendarHeatmap.ReactCalendarHeatmapValue<string> | undefined | HeatmapDay | null) => {
    if (!v) return "";
    const meta = metaMap.get(v.date);
    if (!meta) return v.date;
    const lines = [
      `<div class="font-mono text-[11px] font-semibold">${v.date}</div>`,
      `<div class="mt-1 text-[10px]">
        ${meta.checkedIn ? "✓" : "✗"} Check-in ·
        ${meta.leetcode} LeetCode ·
        ${meta.github} GitHub
      </div>`,
    ];
    if (meta.dailyTasks > 0 || Object.keys(meta.planTasksByCategory).length > 0) {
      const tasks = [
        meta.dailyTasks > 0 ? `${meta.dailyTasks} daily` : null,
        ...Object.entries(meta.planTasksByCategory).map(
          ([cat, n]) => `${n} ${cat.toLowerCase()}`
        ),
      ].filter(Boolean);
      if (tasks.length > 0) {
        lines.push(`<div class="mt-1 text-[10px]">${tasks.join(" · ")}</div>`);
      }
    }
    return lines.join("");
  };

  if (!data || data.length === 0) {
    return <div className="text-muted2 text-sm">No data available</div>;
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
            "data-tooltip-html": tooltipContent(v),
            "data-tooltip-place": "top",
          }) as Record<string, string>}
        />
      </div>
      <Tooltip id="heatmap-tooltip" className="bg-surface! text-text! text-[11px]!" />
    </>
  );
}


