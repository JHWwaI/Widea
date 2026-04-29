-- CreateEnum
CREATE TYPE "WorkspaceStageStatus" AS ENUM ('PENDING', 'ACTIVE', 'DONE');

-- CreateEnum
CREATE TYPE "WorkspaceTaskStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED', 'OUTSOURCED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostCategory" ADD VALUE 'MENTOR_REQUEST';
ALTER TYPE "PostCategory" ADD VALUE 'BETA_TESTER';

-- CreateTable
CREATE TABLE "workspace_stages" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WorkspaceStageStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_tasks" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "WorkspaceTaskStatus" NOT NULL DEFAULT 'PENDING',
    "outsource_role" TEXT,
    "community_post_id" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workspace_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_stages_idea_id_idx" ON "workspace_stages"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_stages_idea_id_stage_number_key" ON "workspace_stages"("idea_id", "stage_number");

-- CreateIndex
CREATE INDEX "workspace_tasks_stage_id_idx" ON "workspace_tasks"("stage_id");

-- CreateIndex
CREATE INDEX "workspace_tasks_status_idx" ON "workspace_tasks"("status");

-- AddForeignKey
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "workspace_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
