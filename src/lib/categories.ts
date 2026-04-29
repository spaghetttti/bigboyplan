import { prisma } from "@/lib/db";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
};

export async function getAllCategories(): Promise<CategoryRow[]> {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export function colorClassForCategory(name: string, categories: CategoryRow[]): string {
  const cat = categories.find((c) => c.name.toUpperCase() === name.toUpperCase());
  if (cat) return colorToTailwindClass(cat.color);
  return "bg-[var(--surface2)] border-[var(--border2)] text-[var(--muted2)]";
}

// Maps the stored hex colors (which match design system tokens) to Tailwind classes.
// This keeps PlanTag a pure presentational component with no DB dependency.
function colorToTailwindClass(hex: string): string {
  switch (hex.toLowerCase()) {
    case "#a78bfa": return "bg-[var(--purple-dim)] border-[rgba(167,139,250,0.25)] text-[var(--purple)]";
    case "#2dd4bf": return "bg-[var(--teal-dim)] border-[rgba(45,212,191,0.25)] text-[var(--teal)]";
    case "#fbbf24": return "bg-[var(--amber-dim)] border-[rgba(251,191,36,0.25)] text-[var(--amber)]";
    case "#f87171": return "bg-[var(--coral-dim)] border-[rgba(248,113,113,0.25)] text-[var(--coral)]";
    case "#4ade80": return "bg-[var(--green-dim)] border-[rgba(74,222,128,0.25)] text-[var(--green)]";
    case "#60a5fa": return "bg-[var(--blue-dim)] border-[rgba(96,165,250,0.25)] text-[var(--blue)]";
    default:        return "bg-[var(--surface2)] border-[var(--border2)] text-[var(--muted2)]";
  }
}
