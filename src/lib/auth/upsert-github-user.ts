import "server-only";

import { prisma } from "@/lib/db";
import { trySyncUserToSupabase } from "@/lib/auth/sync-user-supabase";

export type GitHubProfileInput = {
  id: string | number;
  login?: string;
  email?: string | null;
  avatar_url?: string | null;
};

export async function upsertUserFromGitHub(profile: GitHubProfileInput) {
  const githubId = String(profile.id);
  const login =
    profile.login && profile.login.length > 0 ? profile.login : "github_user";

  const user = await prisma.user.upsert({
    where: { githubId },
    create: {
      githubId,
      githubLogin: login,
      email: profile.email ?? null,
      avatarUrl: profile.avatar_url ?? null,
    },
    update: {
      githubLogin: login,
      email: profile.email ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
    },
  });

  await trySyncUserToSupabase(user);
  return user;
}
