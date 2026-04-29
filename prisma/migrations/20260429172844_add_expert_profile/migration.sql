-- CreateEnum
CREATE TYPE "ExpertCategory" AS ENUM ('DEVELOPER', 'DESIGNER', 'MARKETER', 'AC_MENTOR', 'PLANNER', 'PM', 'OTHER');

-- CreateTable
CREATE TABLE "expert_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "ExpertCategory" NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "hourly_rate_min" INTEGER,
    "hourly_rate_max" INTEGER,
    "links" JSONB NOT NULL DEFAULT '[]',
    "location" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expert_profiles_user_id_key" ON "expert_profiles"("user_id");

-- CreateIndex
CREATE INDEX "expert_profiles_category_idx" ON "expert_profiles"("category");

-- CreateIndex
CREATE INDEX "expert_profiles_available_idx" ON "expert_profiles"("available");
