const TAG_MAP: Record<string, string> = {
  dsa: "DSA",
  java: "JAVA",
  design: "DESIGN",
  devops: "DEVOPS",
  review: "REVIEW",
};

export const SUPPORTED_NOTE_TAGS = Object.keys(TAG_MAP);

export function extractGoalMentionsFromNote(content: string): string[] {
  const out = new Set<string>();
  const matches = content.match(/#[a-zA-Z]+/g) ?? [];
  for (const raw of matches) {
    const key = raw.slice(1).toLowerCase();
    const mapped = TAG_MAP[key];
    if (mapped) out.add(mapped);
  }
  return Array.from(out);
}

