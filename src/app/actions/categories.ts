"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";

export async function addCategory(formData: FormData): Promise<void> {
  const userId = await requireAuth();
  const name = String(formData.get("name") ?? "").trim().toUpperCase();
  const color = String(formData.get("color") ?? "#a78bfa").trim();
  if (!name) return;

  const last = await prisma.category.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
  });
  await prisma.category.create({
    data: { userId, name, color, sortOrder: (last?.sortOrder ?? 0) + 1, isSystem: false },
  });
  revalidatePath("/settings");
  revalidatePath("/goals");
}

export async function deleteCategory(id: string, _formData: FormData): Promise<void> {
  const userId = await requireAuth();
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.isSystem || cat.userId !== userId) return;
  await prisma.category.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/goals");
}

export async function updateCategoryColor(id: string, formData: FormData): Promise<void> {
  const userId = await requireAuth();
  const color = String(formData.get("color") ?? "#a78bfa").trim();
  await prisma.category.updateMany({ where: { id, userId }, data: { color } });
  revalidatePath("/settings");
  revalidatePath("/goals");
}
