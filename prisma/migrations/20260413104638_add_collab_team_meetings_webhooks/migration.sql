-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'DEVELOPER', 'DESIGNER', 'MARKETER', 'ADVISOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'LEFT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostCategory" ADD VALUE 'OUTSOURCE_REQUEST';
ALTER TYPE "PostCategory" ADD VALUE 'AC_REQUEST';

-- AlterTable
ALTER TABLE "project_policies" ADD COLUMN     "discord_webhook_url" TEXT,
ADD COLUMN     "slack_webhook_url" TEXT;

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "project_id" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'INVITED',
    "invite_token" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "agenda" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_invite_token_key" ON "project_team_members"("invite_token");

-- CreateIndex
CREATE INDEX "project_team_members_project_id_idx" ON "project_team_members"("project_id");

-- CreateIndex
CREATE INDEX "project_team_members_user_id_idx" ON "project_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_project_id_email_key" ON "project_team_members"("project_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "project_meetings_room_id_key" ON "project_meetings"("room_id");

-- CreateIndex
CREATE INDEX "project_meetings_project_id_idx" ON "project_meetings"("project_id");

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
