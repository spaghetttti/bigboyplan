"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  ensureSeededPlanForUser,
  generateTasksFromTemplates,
} from "@/lib/plan/service";
import { addDaysISO, startOfWeekMondayISO, todayISO } from "@/lib/dates";
import { SUPPORTED_NOTE_TAGS } from "@/lib/plan/note-tags";

async function currentUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function ensureSeededPlanAction() {
  const userId = await currentUserIdOrNull();
  await ensureSeededPlanForUser(userId ?? undefined);
  revalidatePath("/dashboard");
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function generateCurrentWeekTasksAction() {
  const userId = await currentUserIdOrNull();
  const plan = await ensureSeededPlanForUser(userId ?? undefined);
  const weekStart = startOfWeekMondayISO(todayISO());
  const weekEnd = addDaysISO(weekStart, 6);
  await generateTasksFromTemplates(plan.id, weekStart, weekEnd);
  revalidatePath("/planner");
  revalidatePath("/calendar");
}

export async function togglePlanTaskCompletion(taskId: string) {
  const task = await prisma.planTask.findUnique({ where: { id: taskId } });
  if (!task) return;
  await prisma.planTask.update({
    where: { id: taskId },
    data: { completed: !task.completed },
  });
  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function addManualPlanTask(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const date = String(formData.get("date") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "REVIEW");
  const detail = String(formData.get("detail") ?? "").trim();
  const estimatedHoursRaw = Number(formData.get("estimatedHours") ?? 0);
  if (!planId || !date || !title) return;
  await prisma.planTask.create({
    data: {
      planId,
      date,
      title,
      detail: detail || null,
      category: category as never,
      estimatedHours: Number.isFinite(estimatedHoursRaw) ? estimatedHoursRaw : null,
      source: "MANUAL",
    },
  });
  revalidatePath("/planner");
  revalidatePath("/calendar");
}

export async function updatePlanTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const date = String(formData.get("date") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "REVIEW").toUpperCase();
  const detail = String(formData.get("detail") ?? "").trim();
  const estimatedHoursValue = String(formData.get("estimatedHours") ?? "").trim();
  const estimatedHoursRaw = Number(estimatedHoursValue);

  const allowedCategories = ["DSA", "JAVA", "DESIGN", "DEVOPS", "REVIEW", "MOCK"];
  if (!taskId || !date || !title || !allowedCategories.includes(category)) return;

  await prisma.planTask.update({
    where: { id: taskId },
    data: {
      date,
      title,
      detail: detail || null,
      category: category as never,
      estimatedHours:
        estimatedHoursValue === ""
          ? null
          : Number.isFinite(estimatedHoursRaw)
            ? estimatedHoursRaw
            : null,
    },
  });

  revalidatePath("/planner");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/today");
}

export async function updatePlanConstraints(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  if (!planId) return;
  const minHoursPerWeek = Number(formData.get("minHoursPerWeek") ?? 0);
  const maxHoursPerWeek = Number(formData.get("maxHoursPerWeek") ?? 0);
  const hasFullTimeJob = String(formData.get("hasFullTimeJob") ?? "") === "on";
  const eveningsWeekends =
    String(formData.get("eveningsWeekends") ?? "") === "on";
  const note = String(formData.get("note") ?? "");

  const existing = await prisma.planConstraint.findFirst({ where: { planId } });
  if (existing) {
    await prisma.planConstraint.update({
      where: { id: existing.id },
      data: {
        minHoursPerWeek,
        maxHoursPerWeek,
        hasFullTimeJob,
        eveningsWeekends,
        note,
      },
    });
  } else {
    await prisma.planConstraint.create({
      data: {
        planId,
        minHoursPerWeek,
        maxHoursPerWeek,
        hasFullTimeJob,
        eveningsWeekends,
        note,
      },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function upsertDailyNote(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const date = String(formData.get("date") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!planId || !date) return;
  // Keep only supported goal hashtags canonicalized to lowercase.
  const normalized = content.replace(/#[a-zA-Z]+/g, (raw) => {
    const key = raw.slice(1).toLowerCase();
    return SUPPORTED_NOTE_TAGS.includes(key) ? `#${key}` : raw;
  });
  await prisma.dailyNote.upsert({
    where: { planId_date: { planId, date } },
    create: { planId, date, content: normalized },
    update: { content: normalized },
  });
  revalidatePath("/calendar");
  revalidatePath("/today");
}

