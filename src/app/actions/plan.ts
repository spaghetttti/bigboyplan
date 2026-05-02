"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  archivePlan as archivePlanLib,
  createPlan,
  ensureActivePlan,
  setActivePlan as setActivePlanLib,
} from "@/lib/plan/service";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidatePath("/goals");
  revalidatePath("/settings");
}

export async function ensureActivePlanAction() {
  const userId = await requireAuth();
  await ensureActivePlan(userId);
  revalidateAll();
}

export async function createPlanForm(formData: FormData) {
  const userId = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return;

  await createPlan(userId, {
    title,
    description: description || null,
    startDate,
    endDate: endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : null,
  });
  revalidateAll();
}

export async function setActivePlanAction(planId: string) {
  const userId = await requireAuth();
  await setActivePlanLib(userId, planId);
  revalidateAll();
}

export async function archivePlanAction(planId: string) {
  const userId = await requireAuth();
  await archivePlanLib(userId, planId);
  revalidateAll();
}
