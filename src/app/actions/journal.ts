"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/require-auth";
import { deleteJournalEntry, upsertJournalEntry } from "@/lib/journal";

export async function upsertJournalEntryForm(formData: FormData) {
  const userId = await requireAuth();
  const date = String(formData.get("date") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

  if (!content) {
    await deleteJournalEntry(userId, date);
  } else {
    await upsertJournalEntry(userId, date, content);
  }

  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidatePath("/dashboard");
}
