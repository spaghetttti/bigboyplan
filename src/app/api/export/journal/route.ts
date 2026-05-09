"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { listAllJournalEntries } from "@/lib/journal";
import { renderJournalExport } from "@/lib/export-templates";
import { todayISO } from "@/lib/dates";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = await requireAuth();
  const entries = await listAllJournalEntries(userId);
  const content = renderJournalExport(entries, todayISO());

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-export-${todayISO()}.md"`,
    },
  });
}
