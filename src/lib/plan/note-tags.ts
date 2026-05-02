/**
 * Extracts #hashtag mentions from journal-entry content.
 * Returns the unique uppercased tag names (without the leading `#`).
 * Callers match these against the user's Category names.
 */
export function extractGoalMentionsFromNote(content: string): string[] {
  const out = new Set<string>();
  const matches = content.match(/#[a-zA-Z][a-zA-Z0-9_-]*/g) ?? [];
  for (const raw of matches) {
    out.add(raw.slice(1).toUpperCase());
  }
  return Array.from(out);
}
