import { tagClassForCategory } from "@/lib/tags";

export function planTagClass(category: string): string {
  return tagClassForCategory(category);
}

export function PlanTag({ category }: { category: string }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${planTagClass(category)}`}
    >
      {category}
    </span>
  );
}
