-- Cast enum → text in-place (preserves all existing row values)
ALTER TABLE "PlanTask" ALTER COLUMN "category" TYPE TEXT USING "category"::text;
ALTER TABLE "WeeklyTemplate" ALTER COLUMN "category" TYPE TEXT USING "category"::text;

-- Now it's safe to drop the enum
DROP TYPE "PlanCategory";

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b6966',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- Seed system categories (match existing enum values + OTHER)
INSERT INTO "categories" ("id", "name", "color", "sortOrder", "isSystem") VALUES
  (gen_random_uuid()::text, 'DSA',    '#a78bfa', 1, true),
  (gen_random_uuid()::text, 'JAVA',   '#2dd4bf', 2, true),
  (gen_random_uuid()::text, 'DESIGN', '#fbbf24', 3, true),
  (gen_random_uuid()::text, 'DEVOPS', '#f87171', 4, true),
  (gen_random_uuid()::text, 'REVIEW', '#4ade80', 5, true),
  (gen_random_uuid()::text, 'MOCK',   '#60a5fa', 6, true),
  (gen_random_uuid()::text, 'OTHER',  '#6b6966', 7, true)
ON CONFLICT ("name") DO NOTHING;
