/** Heatmap level from combined activity score (SPEC §7.1, §8). */
export function scoreToHeatmapLevel(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 5) return 2;
  if (score <= 10) return 3;
  return 4;
}

const HEATMAP_VARS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "var(--heatmap-0)",
  1: "var(--heatmap-1)",
  2: "var(--heatmap-2)",
  3: "var(--heatmap-3)",
  4: "var(--heatmap-4)",
};

export function heatmapColorForScore(score: number): string {
  return HEATMAP_VARS[scoreToHeatmapLevel(score)];
}
