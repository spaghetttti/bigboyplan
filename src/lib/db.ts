import { PrismaClient } from "@prisma/client";
type PrismaDelegate = {
  findFirst: (...args: any[]) => Promise<any>;
  findUnique: (...args: any[]) => Promise<any>;
  findUniqueOrThrow: (...args: any[]) => Promise<any>;
  findMany: (...args: any[]) => Promise<any[]>;
  create: (...args: any[]) => Promise<any>;
  createMany: (...args: any[]) => Promise<any>;
  update: (...args: any[]) => Promise<any>;
  upsert: (...args: any[]) => Promise<any>;
};

type PrismaWithModels = PrismaClient & {
  user: PrismaDelegate;
  setting: PrismaDelegate;
  goal: PrismaDelegate;
  dailyTask: PrismaDelegate;
  taskCompletion: PrismaDelegate;
  leetcodeLog: PrismaDelegate;
  githubDailyStat: PrismaDelegate;
  plan: PrismaDelegate;
  planConstraint: PrismaDelegate;
  planPhase: PrismaDelegate;
  planMilestone: PrismaDelegate;
  weeklyTemplate: PrismaDelegate;
  planTask: PrismaDelegate;
  dailyNote: PrismaDelegate;
  dailyCheckIn: PrismaDelegate;
  category: PrismaDelegate;
};
const globalForPrisma = globalThis as unknown as { prisma?: PrismaWithModels };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Use local Docker Postgres or Supabase Postgres.",
  );
}

export const prisma: PrismaWithModels =
  (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })) as PrismaWithModels;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
