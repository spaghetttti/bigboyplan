"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  createTask,
  deleteTask,
  setTaskTags,
  toggleTaskCompletion as toggleTaskCompletionLib,
  updateTask,
} from "@/lib/tasks";
import { todayISO } from "@/lib/dates";

function categoryIdsFromForm(formData: FormData): string[] {
  return formData
    .getAll("categoryIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export async function addTaskForm(formData: FormData) {
  const userId = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const notes = String(formData.get("notes") ?? "").trim();
  const isRecurring = String(formData.get("isRecurring") ?? "") === "on";
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = isRecurring ? null : dueDateRaw || null;
  const categoryIds = categoryIdsFromForm(formData);

  await createTask({
    userId,
    title,
    notes: notes || null,
    isRecurring,
    dueDate,
    categoryIds,
  });

  revalidatePath("/today");
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function toggleTaskCompletion(taskId: string, date?: string) {
  const userId = await requireAuth();
  await toggleTaskCompletionLib(userId, taskId, date ?? todayISO());
  revalidatePath("/today");
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

/** Server-action wrapper bound via .bind(null, taskId, date) for `<form>` buttons. */
export async function toggleTaskCompletionForm(taskId: string, date: string) {
  await toggleTaskCompletion(taskId, date);
}

export async function deleteTaskAction(taskId: string) {
  const userId = await requireAuth();
  await deleteTask(userId, taskId);
  revalidatePath("/today");
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updateTaskForm(taskId: string, formData: FormData) {
  const userId = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const notes = String(formData.get("notes") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const categoryIds = categoryIdsFromForm(formData);

  await updateTask(userId, taskId, {
    title,
    notes: notes || null,
    dueDate,
    categoryIds,
  });

  revalidatePath("/today");
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updateTaskTagsForm(taskId: string, formData: FormData) {
  const userId = await requireAuth();
  const ids = categoryIdsFromForm(formData);
  await setTaskTags(userId, taskId, ids);
  revalidatePath("/today");
  revalidatePath("/planner");
  revalidatePath("/calendar");
}
