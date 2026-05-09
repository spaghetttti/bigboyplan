import { prisma } from "@/lib/db";

export type LeetcodeLogRow = {
  id: string;
  userId: string;
  date: string;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  notes: string | null;
};

export type PaginatedLeetcodeLogs = {
  logs: LeetcodeLogRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listLeetcodeLogsPaginated(
  userId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedLeetcodeLogs> {
  const skip = (page - 1) * pageSize;
  const [logs, total] = await Promise.all([
    prisma.leetcodeLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.leetcodeLog.count({ where: { userId } }),
  ]);
  return { logs, total, page, pageSize };
}

export async function listAllLeetcodeLogs(userId: string): Promise<LeetcodeLogRow[]> {
  return prisma.leetcodeLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
}
