"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addCategory(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().toUpperCase();
  const color = String(formData.get("color") ?? "#6b6966").trim();
  if (!name) return;

  const last = await prisma.category.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.category.create({
    data: { name, color, sortOrder: (last?.sortOrder ?? 0) + 1, isSystem: false },
  });
  revalidatePath("/settings");
  revalidatePath("/goals");
}

// Used with .bind(null, id) so the bound result is (formData: FormData) => Promise<void>
export async function deleteCategory(id: string, _formData: FormData): Promise<void> {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.isSystem) return;
  await prisma.category.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/goals");
}

// Used with .bind(null, id) so the bound result is (formData: FormData) => Promise<void>
export async function updateCategoryColor(id: string, formData: FormData): Promise<void> {
  const color = String(formData.get("color") ?? "#6b6966").trim();
  await prisma.category.update({ where: { id }, data: { color } });
  revalidatePath("/settings");
  revalidatePath("/goals");
}
