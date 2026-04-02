"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function upsertLeetcodeLog(date: string, count: number, notes?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false as const, error: "Invalid date" };
  }
  const c = Math.max(0, Math.floor(Number(count)) || 0);
  await prisma.leetcodeLog.upsert({
    where: { date },
    create: { date, count: c, notes: notes?.trim() || null },
    update: { count: c, notes: notes?.trim() || null },
  });
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true as const };
}

export async function upsertLeetcodeForm(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const count = Number(formData.get("count") ?? 0);
  const notes = String(formData.get("notes") ?? "");
  await upsertLeetcodeLog(date, count, notes || undefined);
}
