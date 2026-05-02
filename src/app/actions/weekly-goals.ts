"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { ensureActivePlan } from "@/lib/plan/service";
import {
  createWeeklyGoal,
  deleteWeeklyGoal,
  isoWeekFor,
  setWeeklyGoalStatus,
  updateWeeklyGoalProgress,
  type WeeklyGoalStatus,
} from "@/lib/weekly-goals";
import { todayISO } from "@/lib/dates";

const STATUSES = new Set<WeeklyGoalStatus>([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
]);

export async function addWeeklyGoalForm(formData: FormData) {
  const userId = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim();
  const targetValue = Math.max(0, Math.floor(Number(formData.get("targetValue") ?? 0)));
  const metricUnit = String(formData.get("metricUnit") ?? "").trim() || "items";
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const weekDate = String(formData.get("weekDate") ?? "").trim() || todayISO();
  const { weekNumber, year } = isoWeekFor(weekDate);

  const plan = await ensureActivePlan(userId);

  await createWeeklyGoal({
    userId,
    planId: plan.id,
    weekNumber,
    year,
    title,
    description: description || null,
    targetValue,
    metricUnit,
    categoryId,
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function updateWeeklyGoalProgressForm(goalId: string, formData: FormData) {
  const userId = await requireAuth();
  const actualValue = Math.max(0, Math.floor(Number(formData.get("actualValue") ?? 0)));
  await updateWeeklyGoalProgress(userId, goalId, actualValue);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function setWeeklyGoalStatusAction(goalId: string, formData: FormData) {
  const userId = await requireAuth();
  const status = String(formData.get("status") ?? "") as WeeklyGoalStatus;
  if (!STATUSES.has(status)) return;
  await setWeeklyGoalStatus(userId, goalId, status);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteWeeklyGoalAction(goalId: string) {
  const userId = await requireAuth();
  await deleteWeeklyGoal(userId, goalId);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
