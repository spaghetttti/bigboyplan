-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('DSA', 'JAVA', 'DESIGN', 'DEVOPS', 'REVIEW', 'MOCK');

-- CreateEnum
CREATE TYPE "PlanTaskSource" AS ENUM ('TEMPLATE', 'MANUAL');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConstraint" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "minHoursPerWeek" INTEGER,
    "maxHoursPerWeek" INTEGER,
    "hasFullTimeJob" BOOLEAN NOT NULL DEFAULT false,
    "eveningsWeekends" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "PlanConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPhase" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "monthNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "weekStart" INTEGER NOT NULL,
    "weekEnd" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMilestone" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "phaseId" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTemplate" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "phaseId" TEXT,
    "weekday" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "category" "PlanCategory" NOT NULL,
    "estimatedHours" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "phaseId" TEXT,
    "templateId" TEXT,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "category" "PlanCategory" NOT NULL,
    "estimatedHours" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "source" "PlanTaskSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNote" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plan_userId_idx" ON "Plan"("userId");

-- CreateIndex
CREATE INDEX "PlanConstraint_planId_idx" ON "PlanConstraint"("planId");

-- CreateIndex
CREATE INDEX "PlanPhase_planId_sortOrder_idx" ON "PlanPhase"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanMilestone_planId_sortOrder_idx" ON "PlanMilestone"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanMilestone_phaseId_idx" ON "PlanMilestone"("phaseId");

-- CreateIndex
CREATE INDEX "WeeklyTemplate_planId_weekday_sortOrder_idx" ON "WeeklyTemplate"("planId", "weekday", "sortOrder");

-- CreateIndex
CREATE INDEX "WeeklyTemplate_phaseId_idx" ON "WeeklyTemplate"("phaseId");

-- CreateIndex
CREATE INDEX "PlanTask_planId_date_idx" ON "PlanTask"("planId", "date");

-- CreateIndex
CREATE INDEX "PlanTask_phaseId_idx" ON "PlanTask"("phaseId");

-- CreateIndex
CREATE INDEX "PlanTask_templateId_idx" ON "PlanTask"("templateId");

-- CreateIndex
CREATE INDEX "DailyNote_planId_date_idx" ON "DailyNote"("planId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNote_planId_date_key" ON "DailyNote"("planId", "date");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanConstraint" ADD CONSTRAINT "PlanConstraint_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPhase" ADD CONSTRAINT "PlanPhase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMilestone" ADD CONSTRAINT "PlanMilestone_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMilestone" ADD CONSTRAINT "PlanMilestone_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "PlanPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTemplate" ADD CONSTRAINT "WeeklyTemplate_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTemplate" ADD CONSTRAINT "WeeklyTemplate_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "PlanPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "PlanPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTask" ADD CONSTRAINT "PlanTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WeeklyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNote" ADD CONSTRAINT "DailyNote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
