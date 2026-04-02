"use server";

import { revalidatePath } from "next/cache";
import { syncGithubContributions } from "@/lib/github";
import { SETTING_GITHUB_PAT, setSetting } from "@/lib/settings";

export async function saveGithubPat(pat: string) {
  const v = pat.trim();
  await setSetting(SETTING_GITHUB_PAT, v);
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true as const };
}

export async function runGithubSync() {
  const result = await syncGithubContributions();
  revalidatePath("/settings");
  revalidatePath("/");
  return result;
}

export async function saveGithubPatForm(formData: FormData) {
  const pat = String(formData.get("pat") ?? "");
  await saveGithubPat(pat);
}
