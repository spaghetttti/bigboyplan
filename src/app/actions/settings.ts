"use server";

import { revalidatePath } from "next/cache";
import { syncGithubContributions } from "@/lib/github";
import { updateUserSettings } from "@/lib/settings";
import { requireAuth } from "@/lib/auth/require-auth";

export async function updateSettingsForm(formData: FormData): Promise<void> {
  const userId = await requireAuth();
  const leetcodeUsername = String(formData.get("leetcodeUsername") ?? "").trim();
  const githubUsername = String(formData.get("githubUsername") ?? "").trim();
  const githubToken = String(formData.get("githubToken") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  await updateUserSettings(userId, {
    leetcodeUsername: leetcodeUsername || null,
    githubUsername: githubUsername || null,
    githubToken: githubToken || null,
    ...(timezone ? { timezone } : {}),
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function runGithubSync() {
  const userId = await requireAuth();
  const result = await syncGithubContributions(userId);
  revalidatePath("/settings");
  revalidatePath("/");
  return result;
}
