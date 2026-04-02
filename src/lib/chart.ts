export function formatChartTick(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}
