import { prisma } from "@/lib/db";

export type UserSettingsRow = {
  id: string;
  userId: string;
  leetcodeUsername: string | null;
  githubUsername: string | null;
  githubToken: string | null;
  timezone: string;
  updatedAt: Date;
};

export type UserSettingsPatch = Partial<{
  leetcodeUsername: string | null;
  githubUsername: string | null;
  githubToken: string | null;
  timezone: string;
}>;

/** Reads the user's settings row, creating an empty one if missing. */
export async function getUserSettings(userId: string): Promise<UserSettingsRow> {
  const row = await prisma.userSettings.findUnique({ where: { userId } });
  if (row) return row;
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) throw new Error(`User ${userId} not found — session is stale, please sign in again`);
  return prisma.userSettings.create({ data: { userId } });
}

export async function updateUserSettings(
  userId: string,
  patch: UserSettingsPatch,
): Promise<UserSettingsRow> {
  return prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}

export async function getGithubToken(userId: string): Promise<string | null> {
  const row = await prisma.userSettings.findUnique({
    where: { userId },
    select: { githubToken: true },
  });
  const t = row?.githubToken?.trim();
  return t && t.length > 0 ? t : null;
}
