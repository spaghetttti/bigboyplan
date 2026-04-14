-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "github_id" TEXT NOT NULL,
    "github_login" TEXT NOT NULL,
    "email" TEXT,
    "avatar_url" TEXT,
    "leetcode_username" TEXT,
    "github_username" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");
