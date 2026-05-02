"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { todayISO } from "@/lib/dates";

export async function checkInToday(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireAuth();
    const date = todayISO();
    await prisma.dailyCheckIn.upsert({
      where: { userId_date: { userId, date } },
      update: { checkedAt: new Date() },
      create: { userId, date },
    });
    revalidatePath("/today");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Check-in failed" };
  }
}
