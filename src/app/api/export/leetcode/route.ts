"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { listAllLeetcodeLogs } from "@/lib/leetcode";
import { renderLeetcodeExport } from "@/lib/export-templates";
import { todayISO } from "@/lib/dates";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = await requireAuth();
  const logs = await listAllLeetcodeLogs(userId);
  const content = renderLeetcodeExport(logs, todayISO());

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="leetcode-export-${todayISO()}.md"`,
    },
  });
}
