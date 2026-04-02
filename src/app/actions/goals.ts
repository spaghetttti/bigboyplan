"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addGoal(title: string, category: string) {
  const t = title.trim();
  if (!t) return { ok: false as const, error: "Title required" };
  const last = await prisma.goal.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.goal.create({
    data: {
      title: t,
      category: category || "OTHER",
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/goals");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteGoal(id: string) {
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function addGoalForm(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const category = String(formData.get("category") ?? "OTHER");
  await addGoal(title, category);
}
