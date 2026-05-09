import type { JournalEntryWithTags } from "./journal";
import type { LeetcodeLogRow } from "./leetcode";

// ─────────────────────────────────────────────────────────────────────────────
// Journal export
// Format can be adjusted here; this template is also used by the planned
// Notion integration (see lib/md-templates/export-template-format.md).
// ─────────────────────────────────────────────────────────────────────────────

export function renderJournalExport(
  entries: JournalEntryWithTags[],
  exportedAt: string,
): string {
  const lines: string[] = [
    "# Journal Entries — DevTrack Export",
    `> Exported: ${exportedAt}`,
    `> Total entries: ${entries.length}`,
    "",
  ];

  if (entries.length === 0) {
    lines.push("_No journal entries found._");
    return lines.join("\n");
  }

  for (const entry of entries) {
    lines.push("---", "", `## ${entry.date}`, "");

    if (entry.tags.length > 0) {
      const tagStr = entry.tags.map((t) => `#${t.category.name}`).join(" ");
      lines.push(`**Tags:** ${tagStr}`, "");
    }

    lines.push(entry.content, "");
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// LeetCode export
// ─────────────────────────────────────────────────────────────────────────────

export function renderLeetcodeExport(
  logs: LeetcodeLogRow[],
  exportedAt: string,
): string {
  const totalProblems = logs.reduce(
    (sum, l) => sum + l.easyCount + l.mediumCount + l.hardCount,
    0,
  );

  const lines: string[] = [
    "# LeetCode Log — DevTrack Export",
    `> Exported: ${exportedAt}`,
    `> Total entries: ${logs.length} | Total problems: ${totalProblems}`,
    "",
  ];

  if (logs.length === 0) {
    lines.push("_No LeetCode logs found._");
    return lines.join("\n");
  }

  for (const log of logs) {
    const total = log.easyCount + log.mediumCount + log.hardCount;
    const counts = [
      log.easyCount > 0 ? `Easy: ${log.easyCount}` : null,
      log.mediumCount > 0 ? `Medium: ${log.mediumCount}` : null,
      log.hardCount > 0 ? `Hard: ${log.hardCount}` : null,
      `Total: ${total}`,
    ]
      .filter(Boolean)
      .join(" | ");

    lines.push("---", "", `## ${log.date}`, "", counts, "");

    if (log.notes) {
      lines.push(log.notes, "");
    }
  }

  return lines.join("\n");
}
