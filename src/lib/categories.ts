import { prisma } from "@/lib/db";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
};

const SYSTEM_CATEGORIES: { name: string; color: string; sortOrder: number }[] = [
  { name: "DSA",    color: "#a78bfa", sortOrder: 1 },
  { name: "JAVA",   color: "#2dd4bf", sortOrder: 2 },
  { name: "DESIGN", color: "#fbbf24", sortOrder: 3 },
  { name: "DEVOPS", color: "#f87171", sortOrder: 4 },
  { name: "REVIEW", color: "#4ade80", sortOrder: 5 },
  { name: "MOCK",   color: "#60a5fa", sortOrder: 6 },
  { name: "OTHER",  color: "#6b6966", sortOrder: 7 },
];

export async function getAllCategories(userId: string): Promise<CategoryRow[]> {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
}

/** Seeds system categories for a user if they don't exist yet. Called on first login. */
export async function ensureUserCategories(userId: string): Promise<void> {
  await Promise.all(
    SYSTEM_CATEGORIES.map((cat) =>
      prisma.category.upsert({
        where: { userId_name: { userId, name: cat.name } },
        create: { userId, name: cat.name, color: cat.color, sortOrder: cat.sortOrder, isSystem: true },
        update: {},
      })
    )
  );
}

export function colorClassForCategory(name: string, categories: CategoryRow[]): string {
  const cat = categories.find((c) => c.name.toUpperCase() === name.toUpperCase());
  if (cat) return colorToTailwindClass(cat.color);
  return "bg-[var(--surface2)] border-[var(--border2)] text-[var(--muted2)]";
}

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
