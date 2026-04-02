"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addDailyTask(title: string) {
  const t = title.trim();
  if (!t) return { ok: false as const, error: "Title required" };
  const last = await prisma.dailyTask.findFirst({
    where: { archived: false },
    orderBy: { sortOrder: "desc" },
  });
  await prisma.dailyTask.create({
    data: { title: t, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true as const };
}

export async function archiveDailyTask(taskId: string) {
  await prisma.dailyTask.update({
    where: { id: taskId },
    data: { archived: true },
  });
  revalidatePath("/today");
  revalidatePath("/");
}

export async function toggleTaskCompletion(taskId: string, date: string) {
  const existing = await prisma.taskCompletion.findUnique({
    where: { taskId_date: { taskId, date } },
  });
  if (existing) {
    await prisma.taskCompletion.delete({ where: { id: existing.id } });
  } else {
    await prisma.taskCompletion.create({ data: { taskId, date } });
  }
  revalidatePath("/today");
  revalidatePath("/");
}

export async function addDailyTaskForm(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  await addDailyTask(title);
}
