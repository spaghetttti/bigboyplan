"use client";
import dynamic from "next/dynamic";
import type { HeatmapDay } from "@/lib/stats";

const ActivityHeatmap = dynamic(
  () => import("./ActivityHeatmap").then((m) => m.ActivityHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[160px] animate-pulse rounded bg-surface2" />
    ),
  }
);

export function ActivityHeatmapLoader({ data }: { data: HeatmapDay[] }) {
  return <ActivityHeatmap data={data} />;
}
