import { type Express, type Request, type Response } from "express";
import { type PrismaClient, type Prisma, type TargetMarket } from "@prisma/client";
import Groq from "groq-sdk";
import { requireAuth } from "../lib/auth.js";
import { consumeCredits, getCreditBalance } from "../lib/credits.js";
import {
  getAuthedUser,
  handleRouteError,
  respondCreditConflict,
  respondInsufficientCredits,
} from "../lib/http.js";
import {
  IDEA_MATCH_GENERATION_VERSION,
  normalizeGeneratedIdeas,
} from "../lib/ideaMatch.js";
import { searchSimilarCases } from "../lib/vectorDb.js";

const CREDIT_COSTS = { "idea-match": 10, "idea-unlock": 5 };

interface CustomerNeeds {
  industries: string[];
  problemKeywords: string;
  budgetRange: string;
  teamSize: string;
  revenueGoal: string;
  commitment: string;
  launchTimeline: string;
  technicalSkills: string[];
  domainExpertise: string[];
  existingAssets: string[];
  targetMarket: string;
  targetCustomerAge: string;
  revenueModelPref: string[];
  riskTolerance: string;
}

function buildSemanticQuery(needs: CustomerNeeds): string {
  const parts: string[] = [];

  if (needs.problemKeywords) {
    parts.push(`Problem to solve: ${needs.problemKeywords}`);
  }

  if (needs.industries.length > 0) {
    parts.push(`Industries: ${needs.industries.join(", ")}`);
  }

  parts.push(`Target market: ${needs.targetMarket}`);

  if (needs.revenueModelPref.length > 0) {
    parts.push(`Revenue model preference: ${needs.revenueModelPref.join(", ")}`);
  }

  if (needs.technicalSkills.length > 0) {
    parts.push(`Technical capabilities: ${needs.technicalSkills.join(", ")}`);
  }

  if (needs.domainExpertise.length > 0) {
    parts.push(`Domain expertise: ${needs.domainExpertise.join(", ")}`);
  }

  const budgetLabel: Record<string, string> = {
    ZERO: "zero budget (bootstrapped, no initial capital)",
    UNDER_5M: "micro budget under $4K",
    FIVE_TO_10M: "small budget $4K-$8K",
    TEN_TO_30M: "moderate budget $8K-$25K",
    THIRTY_TO_50M: "mid-sized budget $25K-$40K",
    FIFTY_TO_100M: "significant budget $40K-$80K",
    OVER_100M: "large budget over $80K",
  };
  if (needs.budgetRange && budgetLabel[needs.budgetRange]) {
    parts.push(`Budget scale: ${budgetLabel[needs.budgetRange]}`);
  }

  const teamLabel: Record<string, string> = {
    SOLO: "solo founder",
    TWO_TO_THREE: "small team of 2-3",
    FOUR_TO_TEN: "team of 4-10",
    OVER_TEN: "team of 10+",
  };
  if (needs.teamSize && teamLabel[needs.teamSize]) {
    parts.push(`Team: ${teamLabel[needs.teamSize]}`);
  }

  if (needs.existingAssets.length > 0) {
    parts.push(`Existing assets: ${needs.existingAssets.join(", ")}`);
  }

  if (needs.targetCustomerAge) {
    parts.push(`Target customer age: ${needs.targetCustomerAge}`);
  }

  return parts.join(". ") + ".";
}

function buildIdeaMatchPrompt(
  matchedCases: Array<{
    companyName: string;
    industry: string | null;
    revenueModel: string | null;
    targetMarket: string;
    targetCustomerProfile: string | null;
    problemStatement: string | null;
    signatureMoves: string | null;
    koreaStrategy: Record<string, unknown> | null;
    replicationGuide: Record<string, unknown> | null;
    marketTiming: Record<string, unknown> | null;
    score: number;
  }>,
  needs: CustomerNeeds
): string {
  const caseSummary = matchedCases
    .map((item, index) => {
      let summary = `## 벤치마크 ${index + 1}: ${item.companyName}`;
      summary += `\n- 산업: ${item.industry ?? "N/A"} | 수익모델: ${item.revenueModel ?? "N/A"} | 시장: ${item.targetMarket} | 유사도: ${item.score}`;

      if (item.targetCustomerProfile) {
        summary += `\n- 핵심 고객: ${item.targetCustomerProfile}`;
      }
      if (item.problemStatement) {
        summary += `\n- 해결한 문제: ${item.problemStatement.substring(0, 120)}${item.problemStatement.length > 120 ? "..." : ""}`;
      }
      if (item.signatureMoves) {
        summary += `\n- 핵심 성장 전략: ${item.signatureMoves.substring(0, 120)}${item.signatureMoves.length > 120 ? "..." : ""}`;
      }

      // 한국 전략 분석 — 이 데이터가 아이디어 품질을 결정함
      const ks = item.koreaStrategy;
      if (ks) {
        if (ks.marketSizeEstKRW) summary += `\n- 한국 시장 규모: ${ks.marketSizeEstKRW}`;
        if (Array.isArray(ks.localCompetitors) && ks.localCompetitors.length > 0) {
          summary += `\n- 국내 경쟁사: ${(ks.localCompetitors as string[]).slice(0, 3).join(", ")}`;
        }
        if (Array.isArray(ks.directAdaptable) && ks.directAdaptable.length > 0) {
          summary += `\n- 한국에서 그대로 쓸 수 있는 전략: ${(ks.directAdaptable as string[]).slice(0, 2).join(" / ")}`;
        }
        if (Array.isArray(ks.mustChange) && ks.mustChange.length > 0) {
          summary += `\n- 반드시 바꿔야 할 것: ${(ks.mustChange as string[]).slice(0, 2).join(" / ")}`;
        }
        if (ks.culturalInsights) summary += `\n- 한국 문화 인사이트: ${String(ks.culturalInsights).substring(0, 100)}`;
        if (ks.successScore) summary += `\n- 한국 성공 가능성 점수: ${ks.successScore}/100 (${ks.successScoreReason ?? ""})`;
        if (ks.bestLaunchCity) summary += `\n- 한국 최적 런칭 채널/도시: ${ks.bestLaunchCity}`;
      }

      // 복제 가이드 — 실현 가능성 판단 근거
      const rg = item.replicationGuide;
      if (rg) {
        if (rg.minCapitalKRW) summary += `\n- 최소 필요 자본: ${Number(rg.minCapitalKRW).toLocaleString("ko-KR")}원`;
        if (rg.monthsToMVP) summary += `\n- MVP까지 ${rg.monthsToMVP}개월 / 첫 매출까지 ${rg.monthsToRevenue ?? "?"}개월`;
        if (Array.isArray(rg.criticalSuccessFactors) && rg.criticalSuccessFactors.length > 0) {
          summary += `\n- 성공 필수 조건: ${(rg.criticalSuccessFactors as string[]).slice(0, 2).join(" / ")}`;
        }
        if (Array.isArray(rg.commonFailureModes) && rg.commonFailureModes.length > 0) {
          summary += `\n- 흔한 실패 패턴: ${(rg.commonFailureModes as string[]).slice(0, 2).join(" / ")}`;
        }
      }

      // 시장 타이밍 — 지금 한국에서 해야 하는 이유
      const mt = item.marketTiming;
      if (mt) {
        if (mt.koreaTimingNote) summary += `\n- 한국 지금 타이밍: ${String(mt.koreaTimingNote).substring(0, 120)}`;
        if (mt.opportunityWindow) summary += `\n- 기회 창: ${String(mt.opportunityWindow).substring(0, 80)}`;
      }

      return summary;
    })
    .join("\n\n");

  return `You are a world-class startup strategy consultant specializing in Korean market entry.

Your task: Based on the REAL benchmark data below (actual analysis of global companies), propose 3 CREATIVE and CONCRETE startup ideas for the Korean market.

CRITICAL RULES:
1. ALL text values MUST be in Korean (한국어). NEVER empty "".
2. Return ONLY valid JSON. No markdown, no code fences.
3. Each idea MUST be grounded in the benchmark data below:
   - Use the "한국에서 그대로 쓸 수 있는 전략" as the foundation
   - Address the "반드시 바꿔야 할 것" as your differentiation
   - Reference the "흔한 실패 패턴"을 피하는 구체적 방법을 summaryKo에 포함
   - Use "한국 지금 타이밍"을 whyNowInKoreaKo의 근거로 활용
4. Be EXTREMELY SPECIFIC:
   - titleKo: 2~4글자 창의적 브랜드명 (예: "팜잇", "셀잇", "닥터봇", "리드플로우")
   - oneLinerKo: "누가 + 무엇을 + 어떻게" 공식 (예: "소상공인이 재고를 POS 연동 AI로 자동 발주하는 SaaS")
   - summaryKo: 5~6문장. 한국 시장 현실 문제 → 해결 방법 → 벤치마크 대비 차별화 → 국내 경쟁사와의 차이
   - whyNowInKoreaKo: 위 벤치마크의 "한국 지금 타이밍" 데이터를 직접 인용하며 구체적 수치 포함
   - first10CustomersKo: 벤치마크의 초기 고객 전략을 한국화 (예: "배달의민족 입점 음식점 중 리뷰 100건 이상 매장에 직접 영업")
5. marketFitScore: 0-100 정수. confidenceScore: 0-100 정수. 각 아이디어마다 다른 점수.
6. sourceBenchmarks: 어떤 벤치마크의 어떤 전략을 어떻게 변형했는지 구체적으로.
7. 3개 아이디어는 서로 완전히 다른 접근 방식 (고객/모델/채널 중 최소 2개는 달라야 함).

=== 실제 글로벌 벤치마크 데이터 (이 데이터를 반드시 근거로 사용할 것) ===

${caseSummary}

=== 여기까지 벤치마크 데이터 ===

Founder profile:
- Industries: ${needs.industries.length > 0 ? needs.industries.join(", ") : "Any"}
- Problem to solve: ${needs.problemKeywords || "Not specified"}
- Budget range: ${needs.budgetRange}
- Team size: ${needs.teamSize}
- Revenue goal: ${needs.revenueGoal || "Not specified"}
- Commitment: ${needs.commitment}
- Launch timeline: ${needs.launchTimeline}
- Technical skills: ${
    needs.technicalSkills.length > 0
      ? needs.technicalSkills.join(", ")
      : "None"
  }
- Domain expertise: ${
    needs.domainExpertise.length > 0 ? needs.domainExpertise.join(", ") : "None"
  }
- Existing assets: ${
    needs.existingAssets.length > 0 ? needs.existingAssets.join(", ") : "None"
  }
- Target market: ${needs.targetMarket}
- Target customer age: ${needs.targetCustomerAge || "Not specified"}
- Preferred revenue models: ${
    needs.revenueModelPref.length > 0
      ? needs.revenueModelPref.join(", ")
      : "No preference"
  }
- Risk tolerance: ${needs.riskTolerance}

Return JSON only in this format:
{
  "ideas": [
    {
      "titleKo": "string",
      "oneLinerKo": "string",
      "summaryKo": "string",
      "whyNowInKoreaKo": "string",
      "sourceBenchmarks": [
        {
          "companyName": "string",
          "whyReferencedKo": "string"
        }
      ],
      "targetCustomer": {
        "personaKo": "string",
        "painKo": "string",
        "buyingTriggerKo": "string"
      },
      "problemDetail": {
        "currentWorkflowKo": "string",
        "failureCostKo": "string"
      },
      "businessModel": {
        "modelKo": "string",
        "pricingKo": "string",
        "expansionKo": "string"
      },
      "mvpScope": {
        "coreFeatures": ["string"],
        "excludeForNow": ["string"]
      },
      "goToMarket": {
        "primaryChannelKo": "string",
        "secondaryChannelsKo": ["string"],
        "first10CustomersKo": "string"
      },
      "executionPlan": [
        {
          "phase": "30days|60days|90days",
          "goalKo": "string",
          "actionsKo": ["string"],
          "kpiKo": "string"
        }
      ],
      "estimatedCost": {
        "buildKo": "string",
        "opsKo": "string",
        "notesKo": "string"
      },
      "risks": [
        {
          "riskKo": "string",
          "impact": "HIGH|MEDIUM|LOW",
          "mitigationKo": "string"
        }
      ],
      "marketFitScore": 0,
      "confidenceScore": 0
    }
  ]
}`;
}

export function registerIdeaMatchRoutes(
  app: Express,
  { prisma, groq }: { prisma: PrismaClient; groq: Groq }
): void {
  app.post(
    "/api/idea-match",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaMatchCost = CREDIT_COSTS["idea-match"];

        const {
          projectTitle,
          industries = [],
          problemKeywords = "",
          budgetRange = "TEN_TO_30M",
          teamSize = "SOLO",
          revenueGoal = "",
          commitment = "FULL_TIME",
          launchTimeline = "SIX_MONTHS",
          technicalSkills = [],
          domainExpertise = [],
          existingAssets = [],
          targetMarket = "B2C",
          targetCustomerAge = "",
          revenueModelPref = [],
          riskTolerance = "BALANCED",
          topK = 5,
          projectPolicyId,
        } = req.body;

        // Input validation
        if (!problemKeywords && industries.length === 0) {
          res.status(400).json({
            error:
              "industries(관련분야) 혹은 problemKeywords(구체적인 문제) 중하나는 반드시입력되어야 합니다.",
          });
          return;
        }

        console.log(
          `\n💡 Idea Match 요청: industries=${JSON.stringify(industries)}, problem="${problemKeywords}"`
        );

        // Load or create project
        const validMarkets: TargetMarket[] = ["B2B", "B2C", "B2B2C"];
        const market = validMarkets.includes(targetMarket) ? targetMarket : "B2C";

        const budgetMap: Record<string, number> = {
          ZERO: 0,
          UNDER_5M: 5_000_000,
          FIVE_TO_10M: 10_000_000,
          TEN_TO_30M: 30_000_000,
          THIRTY_TO_50M: 50_000_000,
          FIFTY_TO_100M: 100_000_000,
          OVER_100M: 200_000_000,
        };

        let project: Awaited<
          ReturnType<typeof prisma.projectPolicy.findUnique>
        > = null;
        let pendingProjectData: Prisma.ProjectPolicyUncheckedCreateInput | null =
          null;
        if (projectPolicyId) {
          project = await prisma.projectPolicy.findUnique({
            where: { id: projectPolicyId },
          });
          if (!project || project.userId !== userId) {
            res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
            return;
          }
        } else {
          pendingProjectData = {
            title:
              projectTitle ||
              `아이디어 매칭 ${new Date().toLocaleDateString("ko-KR")}`,
            targetMarket: market,
            budgetLimit: BigInt(budgetMap[budgetRange] ?? 30_000_000),
            targetDuration: launchTimeline,
            coreCompetencies: technicalSkills,
            industries,
            problemKeywords: problemKeywords || null,
            budgetRange: (budgetRange && budgetRange !== "ZERO") ? budgetRange : null,
            teamSize: teamSize || null,
            revenueGoal: revenueGoal || null,
            commitment: commitment || null,
            launchTimeline: launchTimeline || null,
            technicalSkills,
            domainExpertise,
            existingAssets,
            targetCustomerAge: targetCustomerAge || null,
            revenueModelPref,
            riskTolerance: riskTolerance || null,
            userId,
          };
        }

        const currentBalance = await getCreditBalance(prisma, userId);
        if (currentBalance === null || currentBalance < ideaMatchCost) {
          respondInsufficientCredits(res, {
            feature: "Idea Match",
            required: ideaMatchCost,
            creditBalance: currentBalance,
          });
          return;
        }

        // Build semantic query and search
        const searchQuery = buildSemanticQuery({
          industries,
          problemKeywords,
          budgetRange,
          teamSize,
          revenueGoal,
          commitment,
          launchTimeline,
          technicalSkills,
          domainExpertise,
          existingAssets,
          targetMarket: market,
          targetCustomerAge,
          revenueModelPref,
          riskTolerance,
        });

        console.log(
          `   [1/4] 검색쿼리 생성됨: "${searchQuery.substring(0, 80)}..."`
        );

        console.log(`   [2/4] Pinecone 벡터 검색중..`);
        const vectorResults = await searchSimilarCases(
          searchQuery,
          Math.min(topK, 10),
          market !== "B2C" && market !== "B2B" && market !== "B2B2C"
            ? undefined
            : market
        );

        // Join with PostgreSQL metadata
        const matchedCases = await Promise.all(
          vectorResults.map(async (r) => {
            const meta = await prisma.globalCaseMeta.findUnique({
              where: { vectorDbId: r.metadata.dbId },
              include: { deepAnalysis: true },
            });
            return {
              globalCaseMetaId: meta?.id ?? null,
              companyName: r.metadata.companyName,
              industry: meta?.industry ?? null,
              foundedYear: meta?.foundedYear ?? null,
              fundingStage: meta?.fundingStage ?? null,
              revenueModel: meta?.revenueModel ?? r.metadata.businessModel ?? null,
              targetMarket: r.metadata.targetMarket,
              targetCustomerProfile: meta?.targetCustomerProfile ?? null,
              problemStatement: meta?.deepAnalysis?.problemStatement ?? null,
              signatureMoves: meta?.deepAnalysis?.signatureMoves ?? null,
              koreaStrategy: (meta?.deepAnalysis?.koreaStrategy ?? null) as Record<string, unknown> | null,
              replicationGuide: (meta?.deepAnalysis?.replicationGuide ?? null) as Record<string, unknown> | null,
              marketTiming: (meta?.deepAnalysis?.marketTiming ?? null) as Record<string, unknown> | null,
              score: Math.round(r.score * 10000) / 10000,
            };
          })
        );

        console.log(`   [2/4] 벡터 검색완료: ${matchedCases.length}건 매칭`);
        matchedCases.forEach((c, i) =>
          console.log(
            `         ${i + 1}. ${c.companyName} (유사도: ${c.score}, 업종: ${
              c.industry ?? "-"
            })`
          )
        );

        if (matchedCases.length === 0) {
          const persisted = await prisma.$transaction(async (tx) => {
            const creditResult = await consumeCredits(
              tx,
              userId,
              ideaMatchCost,
              "idea-match"
            );
            if (!creditResult) return null;

            let resolvedProjectId = project?.id ?? "";
            if (!resolvedProjectId && pendingProjectData) {
              const createdProject = await tx.projectPolicy.create({
                data: pendingProjectData,
              });
              resolvedProjectId = createdProject.id;
            }

            return {
              projectPolicyId: resolvedProjectId,
              balanceAfter: creditResult.balanceAfter,
            };
          });

          if (!persisted) {
            respondCreditConflict(res, {
              feature: "Idea Match",
              required: ideaMatchCost,
            });
            return;
          }

          res.status(200).json({
            projectPolicyId: persisted.projectPolicyId,
            searchQuery,
            matchedCases: [],
            localizedIdeas: { ideas: [] },
            generatedIdeas: [],
            message:
              "매칭되는 유사한 사례가 없습니다. 산업이나 분야로 다시 시도해보세요.",
            creditUsed: ideaMatchCost,
            creditBalance: persisted.balanceAfter,
          });
          return;
        }

        // Call Groq to generate ideas
        const ideaPrompt = buildIdeaMatchPrompt(matchedCases, {
          industries,
          problemKeywords,
          budgetRange,
          teamSize,
          revenueGoal,
          commitment,
          launchTimeline,
          technicalSkills,
          domainExpertise,
          existingAssets,
          targetMarket: market,
          targetCustomerAge,
          revenueModelPref,
          riskTolerance,
        });

        console.log(`   [3/4] Groq 아이디어 생성 중..`);
        const primaryModel = process.env.GROQ_IDEA_MODEL ?? "llama-3.3-70b-versatile";
        const fallbackModel = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
        const ideaMessages: Parameters<typeof groq.chat.completions.create>[0]["messages"] = [
          {
            role: "system",
            content: `You are a Korean startup strategy consultant. You MUST follow these rules strictly:
1. Respond with valid JSON only. No markdown, no code fences.
2. ALL text content must be in Korean (한국어) with real, detailed, specific content.
3. NEVER return empty strings. Every field must have at least 2 sentences of meaningful Korean text.
4. Be specific: use real Korean company examples, real pricing in 원, real Korean market data.
5. Generate exactly 3 unique startup ideas.`,
          },
          { role: "user", content: ideaPrompt },
        ];

        let groqResult: Awaited<ReturnType<typeof groq.chat.completions.create>>;
        try {
          groqResult = await groq.chat.completions.create({
            model: primaryModel,
            max_tokens: 8192,
            temperature: 0.7,
            messages: ideaMessages,
          });
        } catch (primaryErr: any) {
          const isRateLimit = primaryErr?.status === 413 || primaryErr?.status === 429 ||
            (typeof primaryErr?.message === "string" && primaryErr.message.includes("rate_limit"));
          if (isRateLimit) {
            console.warn(`   [3/4] ⚠️ ${primaryModel} 토큰 한도 초과 → ${fallbackModel} 폴백`);
            groqResult = await groq.chat.completions.create({
              model: fallbackModel,
              max_tokens: 8192,
              temperature: 0.7,
              messages: ideaMessages,
            });
          } else {
            throw primaryErr;
          }
        }
        const raw = (groqResult.choices[0].message.content ?? "")
          .replace(/^```[a-z]*\n?/i, "")
          .replace(/```$/, "")
          .trim();

        let localizedIdeas: any;
        try {
          localizedIdeas = JSON.parse(raw);
        } catch {
          console.error(`   [3/4] ❌ JSON 파싱 실패. Raw:\n${raw.substring(0, 300)}`);
          res.status(502).json({
            errorCode: "LLM_PARSE_ERROR",
            error: "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        console.log(
          `   [3/4] Idea generation completed: ${(localizedIdeas as any).ideas?.length ?? 0} ideas`
        );
        const normalizedGeneratedIdeas = normalizeGeneratedIdeas(
          localizedIdeas
        );

        // Save to DB with transaction
        console.log(`   [4/4] DB 저장중..`);
        const persisted = await prisma.$transaction(async (tx) => {
          const creditResult = await consumeCredits(
            tx,
            userId,
            ideaMatchCost,
            "idea-match"
          );
          if (!creditResult) return null;

          let resolvedProjectId = project?.id ?? "";
          if (!resolvedProjectId && pendingProjectData) {
            const createdProject = await tx.projectPolicy.create({
              data: pendingProjectData,
            });
            resolvedProjectId = createdProject.id;
          }

          const session = await tx.ideaMatchSession.create({
            data: {
              searchQuery,
              matchedCases: JSON.parse(JSON.stringify(matchedCases)),
              localizedIdeas,
              locale: "ko-KR",
              generationVersion: IDEA_MATCH_GENERATION_VERSION,
              projectPolicyId: resolvedProjectId,
            },
          });

          // Calculate similarity scores and determine free vs paid ideas
          const ideasWithSimilarityScores = normalizedGeneratedIdeas.map(
            (idea) => {
              let avgSimilarity = 0;

              if (
                idea.sourceBenchmarks &&
                Array.isArray(idea.sourceBenchmarks) &&
                idea.sourceBenchmarks.length > 0
              ) {
                const scores: number[] = [];
                for (const bench of idea.sourceBenchmarks) {
                  const benchObj = bench as any;
                  const companyName = benchObj?.companyName || benchObj?.name;
                  if (companyName) {
                    const matched = matchedCases.find(
                      (c) => c.companyName === companyName
                    );
                    if (matched && matched.score > 0) {
                      scores.push(matched.score);
                    }
                  }
                }
                if (scores.length > 0) {
                  avgSimilarity =
                    scores.reduce((a, b) => a + b, 0) / scores.length;
                }
              }

              return {
                idea,
                avgSimilarity: Math.round(avgSimilarity * 10000) / 10000,
                ideaIndex: idea.rank - 1,
              };
            }
          );

          // Top 3 free, bottom 2 paid
          ideasWithSimilarityScores.sort(
            (a, b) => b.avgSimilarity - a.avgSimilarity
          );
          const freeIdeaIndices = new Set(
            ideasWithSimilarityScores.slice(0, 3).map((x) => x.ideaIndex)
          );

          const generatedIdeas = [];
          for (const item of ideasWithSimilarityScores) {
            const idea = item.idea;
            const requiresCredit = !freeIdeaIndices.has(item.ideaIndex);

            const createdIdea = await tx.generatedIdea.create({
              data: {
                sessionId: session.id,
                ...idea,
                similarityScore: item.avgSimilarity,
                requiresCredit,
              },
            });

            generatedIdeas.push(createdIdea);
          }

          return {
            sessionId: session.id,
            projectPolicyId: resolvedProjectId,
            balanceAfter: creditResult.balanceAfter,
            generatedIdeas,
          };
        });

        if (!persisted) {
          respondCreditConflict(res, {
            feature: "Idea Match",
            required: ideaMatchCost,
          });
          return;
        }

        console.log(`   [4/4] 완료됨 (sessionId: ${persisted.sessionId})`);

        // Blur paid ideas
        const unlockCost = CREDIT_COSTS["idea-unlock"];
        const blurredIdeas = persisted.generatedIdeas.map((idea) => {
          if (idea.requiresCredit) {
            return {
              id: idea.id,
              sessionId: idea.sessionId,
              rank: idea.rank,
              status: idea.status,
              titleKo: idea.titleKo,
              oneLinerKo: idea.oneLinerKo,
              similarityScore: idea.similarityScore,
              requiresCredit: idea.requiresCredit,
              unlockCost,
              createdAt: idea.createdAt,
              updatedAt: idea.updatedAt,
            };
          }
          return idea;
        });

        res.json({
          sessionId: persisted.sessionId,
          projectPolicyId: persisted.projectPolicyId,
          matchedCasesCount: matchedCases.length,
          localizedIdeas,
          generatedIdeas: blurredIdeas,
          creditUsed: ideaMatchCost,
          creditBalance: persisted.balanceAfter,
        });
      } catch (err: any) {
        // Groq API specific error handling
        if (err?.status === 429 || err?.error?.type === "rate_limit_exceeded") {
          res.status(429).json({
            errorCode: "LLM_RATE_LIMIT",
            error: "AI 요청 한도를 초과했습니다. 1~2분 후 다시 시도해주세요.",
          });
          return;
        }
        if (err?.status === 503 || err?.status === 502) {
          res.status(503).json({
            errorCode: "LLM_UNAVAILABLE",
            error: "AI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        handleRouteError(res, err, "Idea Match 오류");
      }
    }
  );

  // Unlock paid idea
  app.patch(
    "/api/ideas/:ideaId/unlock",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId)
          ? req.params.ideaId[0]
          : req.params.ideaId;
        const unlockCost = CREDIT_COSTS["idea-unlock"];

        // Load idea
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
        });

        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }

        // Load session to get projectPolicyId
        const session = await prisma.ideaMatchSession.findUnique({
          where: { id: idea.sessionId },
          select: { projectPolicyId: true },
        });

        if (!session) {
          res.status(404).json({ error: "세션을 찾을 수 없습니다." });
          return;
        }

        // Ownership check
        const project = await prisma.projectPolicy.findUnique({
          where: { id: session.projectPolicyId },
          select: { userId: true },
        });

        if (!project || project.userId !== userId) {
          res
            .status(403)
            .json({
              error: "이 아이디어에 접근할 권한이 없습니다.",
            });
          return;
        }

        if (!idea.requiresCredit) {
          res.status(400).json({ error: "이미 공개된 아이디어입니다." });
          return;
        }

        const currentBalance = await getCreditBalance(prisma, userId);
        if (currentBalance === null || currentBalance < unlockCost) {
          respondInsufficientCredits(res, {
            feature: "Idea Unlock",
            required: unlockCost,
            creditBalance: currentBalance,
          });
          return;
        }

        // Transactional unlock
        const result = await prisma.$transaction(async (tx) => {
          const creditResult = await consumeCredits(
            tx,
            userId,
            unlockCost,
            "idea-unlock"
          );
          if (!creditResult) return null;

          const unlockedIdea = await tx.generatedIdea.update({
            where: { id: ideaId },
            data: { requiresCredit: false },
          });

          return {
            idea: unlockedIdea,
            balanceAfter: creditResult.balanceAfter,
          };
        });

        if (!result) {
          respondCreditConflict(res, {
            feature: "Idea Unlock",
            required: unlockCost,
          });
          return;
        }

        res.json({
          message: "아이디어가 공개되었습니다.",
          idea: result.idea,
          creditUsed: unlockCost,
          creditBalance: result.balanceAfter,
        });
      } catch (err) {
        handleRouteError(res, err, "Idea Unlock 오류");
      }
    }
  );
}
