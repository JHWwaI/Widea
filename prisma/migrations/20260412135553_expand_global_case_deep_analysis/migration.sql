-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- AlterTable
ALTER TABLE "global_case_deep_analysis" ADD COLUMN     "competitive_landscape" JSONB,
ADD COLUMN     "expansion_playbook" JSONB,
ADD COLUMN     "founder_dna" JSONB,
ADD COLUMN     "growth_story" JSONB,
ADD COLUMN     "investor_pov" JSONB,
ADD COLUMN     "korea_strategy" JSONB,
ADD COLUMN     "market_timing" JSONB,
ADD COLUMN     "network_effects" JSONB,
ADD COLUMN     "replication_guide" JSONB,
ADD COLUMN     "revenue_deep_dive" JSONB,
ADD COLUMN     "technology_dna" JSONB;

-- AlterTable
ALTER TABLE "global_case_meta" ADD COLUMN     "data_quality_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "difficulty_level" "DifficultyLevel",
ADD COLUMN     "min_capital_krw" BIGINT,
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "global_case_meta_difficulty_level_idx" ON "global_case_meta"("difficulty_level");

-- CreateIndex
CREATE INDEX "global_case_meta_data_quality_score_idx" ON "global_case_meta"("data_quality_score");
