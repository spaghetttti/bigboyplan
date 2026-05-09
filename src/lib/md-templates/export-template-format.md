# Export Template Format

Template logic lives in `tracker/src/lib/export-templates.ts`. Edit that file to change the output format. This document describes the current format and serves as a reference for future integrations (e.g., Notion block mapping).

---

## Journal Export (`renderJournalExport`)

**Download URL:** `GET /api/export/journal` → `journal-export-YYYY-MM-DD.md`

```md
# Journal Entries — DevTrack Export
> Exported: 2026-05-08
> Total entries: 12

---

## 2026-05-08

**Tags:** #DSA #JAVA

Content of the journal entry goes here.
Preserves line breaks and whitespace.

---

## 2026-05-07

Content without tags.

```

**Fields used per entry:**
- `entry.date` — ISO date string
- `entry.tags[].category.name` — uppercased category name
- `entry.content` — raw text, preserved as-is

---

## LeetCode Export (`renderLeetcodeExport`)

**Download URL:** `GET /api/export/leetcode` → `leetcode-export-YYYY-MM-DD.md`

```md
# LeetCode Log — DevTrack Export
> Exported: 2026-05-08
> Total entries: 30 | Total problems: 87

---

## 2026-05-08

Easy: 2 | Medium: 1 | Total: 3

Notes about today's problems go here.

---

## 2026-05-07

Medium: 3 | Hard: 1 | Total: 4

```

**Fields used per log:**
- `log.date` — ISO date string
- `log.easyCount`, `log.mediumCount`, `log.hardCount` — zero values are omitted from the counts line
- `log.notes` — optional, included as a paragraph if present

---

## Notion Integration Note

When the Notion integration is built (`google-calendar-notion-plan.md`), the `pushDayToNotion` function in `lib/notion.ts` will use a similar block structure but rendered as Notion API block objects rather than Markdown strings. The template logic in `export-templates.ts` can serve as the reference for the block shape — the two formats are intentionally aligned.
