-- AlterTable
ALTER TABLE "generated_ideas" ADD COLUMN     "requires_credit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "similarity_score" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "global_case_meta" ADD COLUMN     "estimated_arr" TEXT,
ADD COLUMN     "geographic_origin" TEXT,
ADD COLUMN     "growth_stage" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "korea_presence" TEXT,
ADD COLUMN     "peak_year" INTEGER,
ADD COLUMN     "regulatory_complexity" TEXT,
ADD COLUMN     "target_customer_profile" TEXT,
ADD COLUMN     "target_market" "TargetMarket",
ADD COLUMN     "team_size_at_launch" INTEGER;

-- CreateTable
CREATE TABLE "global_case_deep_analysis" (
    "id" TEXT NOT NULL,
    "problem_statement" TEXT,
    "solution_core" TEXT,
    "initial_wedge" TEXT,
    "unfair_advantage" TEXT,
    "unit_economics" TEXT,
    "signature_moves" TEXT,
    "korea_adapt_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "global_case_meta_id" TEXT NOT NULL,

    CONSTRAINT "global_case_deep_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_case_deep_analysis_global_case_meta_id_key" ON "global_case_deep_analysis"("global_case_meta_id");

-- CreateIndex
CREATE INDEX "generated_ideas_requires_credit_idx" ON "generated_ideas"("requires_credit");

-- CreateIndex
CREATE INDEX "global_case_meta_target_market_idx" ON "global_case_meta"("target_market");

-- CreateIndex
CREATE INDEX "global_case_meta_geographic_origin_idx" ON "global_case_meta"("geographic_origin");

-- CreateIndex
CREATE INDEX "global_case_meta_is_active_idx" ON "global_case_meta"("is_active");

-- AddForeignKey
ALTER TABLE "global_case_deep_analysis" ADD CONSTRAINT "global_case_deep_analysis_global_case_meta_id_fkey" FOREIGN KEY ("global_case_meta_id") REFERENCES "global_case_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
