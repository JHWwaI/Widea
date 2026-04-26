-- Keep local drift from accelerator_bookmarks in sync with migration history.
CREATE TABLE IF NOT EXISTS "accelerator_bookmarks" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    CONSTRAINT "accelerator_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "accelerator_bookmarks_user_id_post_id_key"
ON "accelerator_bookmarks"("user_id", "post_id");

CREATE INDEX IF NOT EXISTS "accelerator_bookmarks_user_id_idx"
ON "accelerator_bookmarks"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'accelerator_bookmarks_user_id_fkey'
    ) THEN
        ALTER TABLE "accelerator_bookmarks"
        ADD CONSTRAINT "accelerator_bookmarks_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'accelerator_bookmarks_post_id_fkey'
    ) THEN
        ALTER TABLE "accelerator_bookmarks"
        ADD CONSTRAINT "accelerator_bookmarks_post_id_fkey"
        FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'IdeaStatus'
    ) THEN
        CREATE TYPE "IdeaStatus" AS ENUM ('DRAFT', 'SHORTLISTED', 'SELECTED', 'ARCHIVED');
    END IF;
END $$;

ALTER TABLE "idea_match_sessions"
ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'ko-KR';

ALTER TABLE "idea_match_sessions"
ADD COLUMN IF NOT EXISTS "generation_version" TEXT;

CREATE TABLE IF NOT EXISTS "generated_ideas" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'DRAFT',
    "title_ko" TEXT NOT NULL,
    "one_liner_ko" TEXT,
    "summary_ko" TEXT,
    "why_now_in_korea_ko" TEXT,
    "market_fit_score" INTEGER,
    "confidence_score" INTEGER,
    "source_benchmarks" JSONB,
    "target_customer" JSONB,
    "problem_detail" JSONB,
    "business_model" JSONB,
    "mvp_scope" JSONB,
    "go_to_market" JSONB,
    "execution_plan" JSONB,
    "estimated_cost" JSONB,
    "risks" JSONB,
    "raw_idea" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "generated_ideas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "generated_ideas_session_id_rank_key"
ON "generated_ideas"("session_id", "rank");

CREATE INDEX IF NOT EXISTS "generated_ideas_session_id_idx"
ON "generated_ideas"("session_id");

CREATE INDEX IF NOT EXISTS "generated_ideas_status_idx"
ON "generated_ideas"("status");

CREATE INDEX IF NOT EXISTS "generated_ideas_market_fit_score_idx"
ON "generated_ideas"("market_fit_score");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'generated_ideas_session_id_fkey'
    ) THEN
        ALTER TABLE "generated_ideas"
        ADD CONSTRAINT "generated_ideas_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "idea_match_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
