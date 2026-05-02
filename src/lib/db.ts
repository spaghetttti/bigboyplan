import { PrismaClient } from "@prisma/client";
type PrismaDelegate = {
  findFirst: (...args: any[]) => Promise<any>;
  findUnique: (...args: any[]) => Promise<any>;
  findUniqueOrThrow: (...args: any[]) => Promise<any>;
  findMany: (...args: any[]) => Promise<any[]>;
  create: (...args: any[]) => Promise<any>;
  createMany: (...args: any[]) => Promise<any>;
  update: (...args: any[]) => Promise<any>;
  updateMany: (...args: any[]) => Promise<any>;
  upsert: (...args: any[]) => Promise<any>;
  delete: (...args: any[]) => Promise<any>;
  deleteMany: (...args: any[]) => Promise<any>;
  count: (...args: any[]) => Promise<number>;
  groupBy: (...args: any[]) => Promise<any[]>;
};

type PrismaWithModels = PrismaClient & {
  user: PrismaDelegate;
  userSettings: PrismaDelegate;
  category: PrismaDelegate;
  plan: PrismaDelegate;
  weeklyGoal: PrismaDelegate;
  task: PrismaDelegate;
  taskTag: PrismaDelegate;
  taskCompletion: PrismaDelegate;
  journalEntry: PrismaDelegate;
  journalTag: PrismaDelegate;
  leetcodeLog: PrismaDelegate;
  githubDailyStat: PrismaDelegate;
  dailyCheckIn: PrismaDelegate;
  weeklyReport: PrismaDelegate;
};
const globalForPrisma = globalThis as unknown as { prisma?: PrismaWithModels };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Use local Docker Postgres or Neon Postgres.",
  );
}

export const prisma: PrismaWithModels =
  (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })) as PrismaWithModels;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
