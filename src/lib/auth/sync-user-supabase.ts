import "server-only";

import type { User } from "@prisma/client";

/**
 * When Supabase is configured, mirror the profile into `public.users`.
 * Hosted Supabase expects `users.id` ↔ `auth.users.id`; that insert may fail until
 * Step 3+ links Supabase Auth — failures are swallowed so GitHub login still works.
 */
export async function trySyncUserToSupabase(user: User): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }
  try {
    const { createSupabaseServiceClient } = await import("@/lib/supabase/admin");
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        github_id: user.githubId,
        github_login: user.githubLogin,
        email: user.email,
        avatar_url: user.avatarUrl,
        leetcode_username: user.leetcodeUsername,
        github_username: user.githubUsername,
      },
      { onConflict: "github_id" },
    );
    if (error) {
      console.warn("[devtrack] Supabase users upsert skipped:", error.message);
    }
  } catch (e) {
    console.warn("[devtrack] Supabase sync error:", e);
  }
}
