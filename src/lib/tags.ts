// tagClassForCategory is used when the full Category list from DB isn't available.
// Category names match the seeded defaults: DSA, JAVA, DESIGN, DEVOPS, REVIEW, MOCK, OTHER.
export function tagClassForCategory(cat: string): string {
  switch (cat.toUpperCase()) {
    case "DSA":    return "bg-[var(--purple-dim)] border-[rgba(167,139,250,0.25)] text-[var(--purple)]";
    case "JAVA":   return "bg-[var(--teal-dim)] border-[rgba(45,212,191,0.25)] text-[var(--teal)]";
    case "DESIGN": return "bg-[var(--amber-dim)] border-[rgba(251,191,36,0.25)] text-[var(--amber)]";
    case "DEVOPS": return "bg-[var(--coral-dim)] border-[rgba(248,113,113,0.25)] text-[var(--coral)]";
    case "REVIEW": return "bg-[var(--green-dim)] border-[rgba(74,222,128,0.25)] text-[var(--green)]";
    case "MOCK":   return "bg-[var(--blue-dim)] border-[rgba(96,165,250,0.25)] text-[var(--blue)]";
    default:       return "bg-[var(--surface2)] border-[var(--border2)] text-[var(--muted2)]";
  }
}
