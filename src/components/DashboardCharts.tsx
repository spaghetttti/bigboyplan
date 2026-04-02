"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartTick } from "@/lib/chart";
import type { DayAggregate } from "@/lib/types";

const axis = { stroke: "var(--muted)", fontSize: 10, fontFamily: "var(--font-dm-mono)" };
const grid = { stroke: "var(--border2)", strokeOpacity: 0.5 };

export function DashboardCharts({ data }: { data: DayAggregate[] }) {
  const chartData = data.map((d) => ({
    ...d,
    tick: formatChartTick(d.date),
  }));

  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        Last 30 days
      </p>
      <div className="h-[300px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid {...grid} vertical={false} />
            <XAxis dataKey="tick" tick={axis} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{
                background: "var(--surface2)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 12,
              }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { date?: string } | undefined;
                return p?.date ?? "";
              }}
            />
            <Legend
              wrapperStyle={{ fontFamily: "var(--font-dm-mono)", fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="leetcode"
              name="LeetCode"
              stroke="var(--purple)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="tasksDone"
              name="Tasks done"
              stroke="var(--teal)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="github"
              name="GitHub activity"
              stroke="var(--amber)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
