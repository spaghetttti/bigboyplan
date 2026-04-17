"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/dates";

export async function checkInToday(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const date = todayISO();
    await prisma.dailyCheckIn.upsert({
      where: { date },
      update: { checkedAt: new Date() },
      create: { date },
    });
    revalidatePath("/today");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Check-in failed" };
  }
}
