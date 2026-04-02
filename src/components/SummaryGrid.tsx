export function SummaryGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-4 py-5 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-text sm:text-[28px]">
            {item.value}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
