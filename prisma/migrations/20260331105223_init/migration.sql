-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TargetMarket" AS ENUM ('B2B', 'B2C', 'B2B2C');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('GO', 'PIVOT', 'HOLD', 'PENDING');

-- CreateEnum
CREATE TYPE "Commitment" AS ENUM ('FULL_TIME', 'PART_TIME', 'SIDE_PROJECT');

-- CreateEnum
CREATE TYPE "RiskTolerance" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "BudgetRange" AS ENUM ('UNDER_5M', 'FIVE_TO_10M', 'TEN_TO_30M', 'THIRTY_TO_50M', 'FIFTY_TO_100M', 'OVER_100M');

-- CreateEnum
CREATE TYPE "TeamSize" AS ENUM ('SOLO', 'TWO_TO_THREE', 'FOUR_TO_TEN', 'OVER_TEN');

-- CreateEnum
CREATE TYPE "LaunchTimeline" AS ENUM ('ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'ONE_YEAR', 'OVER_ONE_YEAR');

-- CreateEnum
CREATE TYPE "CreditAction" AS ENUM ('GRANT', 'CONSUME', 'REFUND', 'EXPIRE');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('IDEA_SHARE', 'QUESTION', 'CASE_STUDY', 'TEAM_RECRUIT', 'FREE_TALK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '',
    "name" TEXT,
    "plan_type" "PlanType" NOT NULL DEFAULT 'FREE',
    "credit_balance" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_policies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_market" "TargetMarket" NOT NULL,
    "budget_limit" BIGINT,
    "target_duration" TEXT,
    "core_competencies" JSONB,
    "industries" JSONB,
    "problem_keywords" TEXT,
    "budget_range" "BudgetRange",
    "team_size" "TeamSize",
    "revenue_goal" TEXT,
    "commitment" "Commitment",
    "launch_timeline" "LaunchTimeline",
    "technical_skills" JSONB,
    "domain_expertise" JSONB,
    "existing_assets" JSONB,
    "target_customer_age" TEXT,
    "revenue_model_pref" JSONB,
    "risk_tolerance" "RiskTolerance",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "project_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_case_meta" (
    "id" TEXT NOT NULL,
    "vector_db_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "founded_year" INTEGER,
    "funding_stage" TEXT,
    "revenue_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_case_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "k_blueprints" (
    "id" TEXT NOT NULL,
    "feasibility_score" INTEGER NOT NULL,
    "regulations" JSONB,
    "localization" JSONB,
    "alt_design" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_policy_id" TEXT NOT NULL,
    "global_case_meta_id" TEXT NOT NULL,

    CONSTRAINT "k_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_ledgers" (
    "id" TEXT NOT NULL,
    "sprint_round" INTEGER NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "action_item" TEXT,
    "decision_status" "DecisionStatus" NOT NULL DEFAULT 'PENDING',
    "result_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "k_blueprint_id" TEXT NOT NULL,

    CONSTRAINT "validation_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_match_sessions" (
    "id" TEXT NOT NULL,
    "search_query" TEXT NOT NULL,
    "matched_cases" JSONB NOT NULL,
    "localized_ideas" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_policy_id" TEXT NOT NULL,

    CONSTRAINT "idea_match_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "credits_granted" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledgers" (
    "id" TEXT NOT NULL,
    "action" "CreditAction" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "credit_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "PostCategory" NOT NULL DEFAULT 'FREE_TALK',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "author_id" TEXT NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "author_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "project_policies_user_id_idx" ON "project_policies"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_case_meta_vector_db_id_key" ON "global_case_meta"("vector_db_id");

-- CreateIndex
CREATE INDEX "global_case_meta_industry_idx" ON "global_case_meta"("industry");

-- CreateIndex
CREATE INDEX "k_blueprints_project_policy_id_idx" ON "k_blueprints"("project_policy_id");

-- CreateIndex
CREATE INDEX "k_blueprints_global_case_meta_id_idx" ON "k_blueprints"("global_case_meta_id");

-- CreateIndex
CREATE INDEX "validation_ledgers_decision_status_idx" ON "validation_ledgers"("decision_status");

-- CreateIndex
CREATE UNIQUE INDEX "validation_ledgers_k_blueprint_id_sprint_round_key" ON "validation_ledgers"("k_blueprint_id", "sprint_round");

-- CreateIndex
CREATE INDEX "idea_match_sessions_project_policy_id_idx" ON "idea_match_sessions"("project_policy_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "credit_ledgers_user_id_idx" ON "credit_ledgers"("user_id");

-- CreateIndex
CREATE INDEX "credit_ledgers_action_idx" ON "credit_ledgers"("action");

-- CreateIndex
CREATE INDEX "community_posts_author_id_idx" ON "community_posts"("author_id");

-- CreateIndex
CREATE INDEX "community_posts_category_idx" ON "community_posts"("category");

-- CreateIndex
CREATE INDEX "community_posts_created_at_idx" ON "community_posts"("created_at");

-- CreateIndex
CREATE INDEX "post_comments_post_id_idx" ON "post_comments"("post_id");

-- CreateIndex
CREATE INDEX "post_comments_author_id_idx" ON "post_comments"("author_id");

-- CreateIndex
CREATE INDEX "post_likes_post_id_idx" ON "post_likes"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_user_id_post_id_key" ON "post_likes"("user_id", "post_id");

-- AddForeignKey
ALTER TABLE "project_policies" ADD CONSTRAINT "project_policies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "k_blueprints" ADD CONSTRAINT "k_blueprints_project_policy_id_fkey" FOREIGN KEY ("project_policy_id") REFERENCES "project_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "k_blueprints" ADD CONSTRAINT "k_blueprints_global_case_meta_id_fkey" FOREIGN KEY ("global_case_meta_id") REFERENCES "global_case_meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_ledgers" ADD CONSTRAINT "validation_ledgers_k_blueprint_id_fkey" FOREIGN KEY ("k_blueprint_id") REFERENCES "k_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_match_sessions" ADD CONSTRAINT "idea_match_sessions_project_policy_id_fkey" FOREIGN KEY ("project_policy_id") REFERENCES "project_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledgers" ADD CONSTRAINT "credit_ledgers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
