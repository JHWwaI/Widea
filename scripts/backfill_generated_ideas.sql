WITH candidate_ideas AS (
  SELECT
    session.id AS session_id,
    idea.value AS idea_json,
    idea.ordinality::INTEGER AS rank
  FROM "idea_match_sessions" AS session
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(session."localized_ideas" -> 'ideas') = 'array'
        THEN session."localized_ideas" -> 'ideas'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS idea(value, ordinality)
  WHERE NOT EXISTS (
    SELECT 1
    FROM "generated_ideas" AS existing
    WHERE existing."session_id" = session.id
  )
),
inserted AS (
  INSERT INTO "generated_ideas" (
    "id",
    "session_id",
    "rank",
    "status",
    "title_ko",
    "one_liner_ko",
    "summary_ko",
    "why_now_in_korea_ko",
    "market_fit_score",
    "confidence_score",
    "source_benchmarks",
    "target_customer",
    "problem_detail",
    "business_model",
    "mvp_scope",
    "go_to_market",
    "execution_plan",
    "estimated_cost",
    "risks",
    "raw_idea",
    "created_at",
    "updated_at"
  )
  SELECT
    CONCAT(candidate_ideas.session_id, '-generated-', candidate_ideas.rank),
    candidate_ideas.session_id,
    candidate_ideas.rank,
    'DRAFT'::"IdeaStatus",
    COALESCE(
      NULLIF(BTRIM(COALESCE(candidate_ideas.idea_json ->> 'titleKo', candidate_ideas.idea_json ->> 'title')), ''),
      CONCAT('아이디어 ', candidate_ideas.rank)
    ),
    NULLIF(BTRIM(COALESCE(candidate_ideas.idea_json ->> 'oneLinerKo', candidate_ideas.idea_json ->> 'oneLiner')), ''),
    NULLIF(BTRIM(COALESCE(candidate_ideas.idea_json ->> 'summaryKo', candidate_ideas.idea_json ->> 'summary')), ''),
    NULLIF(
      BTRIM(
        COALESCE(
          candidate_ideas.idea_json ->> 'whyNowInKoreaKo',
          candidate_ideas.idea_json ->> 'whyNowInKorea',
          candidate_ideas.idea_json ->> 'whyKorea'
        )
      ),
      ''
    ),
    CASE
      WHEN COALESCE(candidate_ideas.idea_json ->> 'marketFitScore', candidate_ideas.idea_json ->> 'feasibilityScore')
        ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN LEAST(
        100,
        GREATEST(
          0,
          ROUND(
            (
              COALESCE(
                candidate_ideas.idea_json ->> 'marketFitScore',
                candidate_ideas.idea_json ->> 'feasibilityScore'
              )
            )::numeric
          )::INTEGER
        )
      )
      ELSE NULL
    END,
    CASE
      WHEN COALESCE(candidate_ideas.idea_json ->> 'confidenceScore', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN LEAST(
        100,
        GREATEST(
          0,
          ROUND((candidate_ideas.idea_json ->> 'confidenceScore')::numeric)::INTEGER
        )
      )
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(candidate_ideas.idea_json -> 'sourceBenchmarks') = 'array'
        AND jsonb_array_length(candidate_ideas.idea_json -> 'sourceBenchmarks') > 0
      THEN candidate_ideas.idea_json -> 'sourceBenchmarks'
      WHEN NULLIF(BTRIM(candidate_ideas.idea_json ->> 'sourceBenchmark'), '') IS NOT NULL
      THEN to_jsonb(
        regexp_split_to_array(
          NULLIF(BTRIM(candidate_ideas.idea_json ->> 'sourceBenchmark'), ''),
          '\s*(,|/|&|\|)\s*'
        )
      )
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'targetCustomer' THEN candidate_ideas.idea_json -> 'targetCustomer'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'problemDetail' THEN candidate_ideas.idea_json -> 'problemDetail'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'businessModel' THEN candidate_ideas.idea_json -> 'businessModel'
      WHEN candidate_ideas.idea_json ? 'revenueModel' THEN candidate_ideas.idea_json -> 'revenueModel'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'mvpScope' THEN candidate_ideas.idea_json -> 'mvpScope'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'goToMarket' THEN candidate_ideas.idea_json -> 'goToMarket'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'executionPlan' THEN candidate_ideas.idea_json -> 'executionPlan'
      WHEN candidate_ideas.idea_json ? 'roadmap' THEN candidate_ideas.idea_json -> 'roadmap'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'estimatedCost' THEN candidate_ideas.idea_json -> 'estimatedCost'
      ELSE NULL
    END,
    CASE
      WHEN candidate_ideas.idea_json ? 'risks' THEN candidate_ideas.idea_json -> 'risks'
      ELSE NULL
    END,
    candidate_ideas.idea_json,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM candidate_ideas
  ON CONFLICT ("session_id", "rank") DO NOTHING
  RETURNING "session_id"
)
UPDATE "idea_match_sessions" AS session
SET
  "locale" = COALESCE(NULLIF(session."locale", ''), 'ko-KR'),
  "generation_version" = COALESCE(session."generation_version", 'idea-match-v2-ko')
WHERE session.id IN (
  SELECT DISTINCT inserted."session_id"
  FROM inserted
);
