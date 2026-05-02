"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";

function clampInt(raw: FormDataEntryValue | null | undefined): number {
  return Math.max(0, Math.floor(Number(raw ?? 0)) || 0);
}

export async function upsertLeetcodeForm(formData: FormData) {
  const userId = await requireAuth();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  const easyCount = clampInt(formData.get("easyCount"));
  const mediumCount = clampInt(formData.get("mediumCount"));
  const hardCount = clampInt(formData.get("hardCount"));
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw || null;

  await prisma.leetcodeLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, easyCount, mediumCount, hardCount, notes },
    update: { easyCount, mediumCount, hardCount, notes },
  });

  revalidatePath("/today");
  revalidatePath("/");
}
