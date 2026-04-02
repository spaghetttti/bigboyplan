"use client";

import dynamic from "next/dynamic";
import type { DayAggregate } from "@/lib/types";

const Charts = dynamic(
  () => import("./DashboardCharts").then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mt-10 h-[300px] animate-pulse rounded-2xl border border-border bg-surface" />
    ),
  },
);

export function DashboardChartsLoader({ data }: { data: DayAggregate[] }) {
  return <Charts data={data} />;
}
