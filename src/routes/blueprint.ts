import { type Express, type Request, type Response } from "express";
import { type PrismaClient, type TargetMarket } from "@prisma/client";
import Groq from "groq-sdk";
import { requireAuth } from "../lib/auth.js";
import { consumeCredits, getCreditBalance } from "../lib/credits.js";
import {
  getAuthedUser,
  handleRouteError,
  respondCreditConflict,
  respondInsufficientCredits,
} from "../lib/http.js";

const CREDIT_COSTS = { blueprint: 5 };

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function buildBlueprintPrompt(
  caseMeta: {
    companyName: string;
    industry: string;
    revenueModel: string | null;
    foundedYear: number | null;
    fundingStage: string | null;
    targetMarket?: string | null;
    geographicOrigin?: string | null;
    koreaPresence?: string | null;
    regulatoryComplexity?: string | null;
  },
  policy: { title: string; targetMarket: string; budgetLimit: bigint | null },
  budgetWon: number,
  targetMarket: string,
  deepAnalysis?: {
    problemStatement?: string | null;
    solutionCore?: string | null;
    initialWedge?: string | null;
    unfairAdvantage?: string | null;
    unitEconomics?: string | null;
    signatureMoves?: string | null;
    koreaAdaptNotes?: string | null;
  } | null
): string {
  let benchmarkSection = `Benchmark company:
- Company: ${caseMeta.companyName}
- Industry: ${caseMeta.industry}
- Revenue model: ${caseMeta.revenueModel ?? "N/A"}
- Founded year: ${caseMeta.foundedYear ?? "N/A"}
- Funding stage: ${caseMeta.fundingStage ?? "N/A"}
- Geographic origin: ${caseMeta.geographicOrigin ?? "N/A"}
- Korea presence: ${caseMeta.koreaPresence ?? "Not determined"}
- Regulatory complexity: ${caseMeta.regulatoryComplexity ?? "Unknown"}`;

  if (deepAnalysis) {
    benchmarkSection += `

Business Model Details:
- Core problem: ${deepAnalysis.problemStatement ?? "N/A"}
- Solution approach: ${deepAnalysis.solutionCore ?? "N/A"}
- Initial wedge: ${deepAnalysis.initialWedge ?? "N/A"}
- Unfair advantage: ${deepAnalysis.unfairAdvantage ?? "N/A"}
- Unit economics: ${deepAnalysis.unitEconomics ?? "N/A"}
- Signature moves (growth): ${deepAnalysis.signatureMoves ?? "N/A"}`;

    if (deepAnalysis.koreaAdaptNotes) {
      benchmarkSection += `

Known Korea Adaptation:
${deepAnalysis.koreaAdaptNotes}`;
    }
  }

  return `You are a go-to-market and localization strategist for South Korea.

Analyze the global benchmark company and create a localized execution blueprint for the user's startup project.

${benchmarkSection}

Project context:
- Project title: ${policy.title}
- Target market: ${targetMarket}
- Budget: KRW ${budgetWon.toLocaleString()} * 10,000

Return JSON only in this format:
{
  "feasibilityScore": 0,
  "regulations": {
    "summary": "string",
    "risks": [
      {
        "regulation": "string",
        "impact": "HIGH|MEDIUM|LOW",
        "description": "string",
        "mitigation": "string"
      }
    ]
  },
  "localization": {
    "summary": "string",
    "channels": [
      {
        "platform": "string",
        "strategy": "string",
        "estimatedCAC": "string",
        "conversionRate": "string"
      }
    ]
  },
  "altDesign": "string"
}`;
}

export function registerBlueprintRoutes(
  app: Express,
  { prisma, groq }: { prisma: PrismaClient; groq: Groq }
): void {
  app.post(
    "/api/blueprint",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const {
          globalCaseId,
          projectPolicyId,
          budget = 20_000_000,
          targetMarket = "B2C",
        } = req.body;
        const blueprintCost = CREDIT_COSTS.blueprint;
        const VALID_MARKETS: TargetMarket[] = ["B2B", "B2C", "B2B2C"];

        // Input validation
        if (!globalCaseId || typeof globalCaseId !== "string") {
          res.status(400).json({
            errorCode: "MISSING_GLOBAL_CASE_ID",
            error: "globalCaseId(string)는 필수입니다.",
          });
          return;
        }
        if (!projectPolicyId || typeof projectPolicyId !== "string") {
          res.status(400).json({
            errorCode: "MISSING_PROJECT_ID",
            error: "projectPolicyId(string)는 필수입니다.",
            hint: "POST /api/projects 로 프로젝트를 먼저 생성하세요.",
          });
          return;
        }
        if (budget !== undefined && budget !== null) {
          const b = Number(budget);
          if (isNaN(b) || b < 0) {
            res.status(400).json({
              errorCode: "INVALID_BUDGET",
              error: "예산은 0 이상의 숫자여야 합니다.",
            });
            return;
          }
        }
        if (targetMarket && !VALID_MARKETS.includes(targetMarket)) {
          res.status(400).json({
            errorCode: "INVALID_TARGET_MARKET",
            error: "유효한 타깃 마켓이 아닙니다: B2B, B2C, B2B2C",
          });
          return;
        }

        // Load global case with deep analysis
        const caseMeta = await prisma.globalCaseMeta.findUnique({
          where: { id: globalCaseId },
          include: { deepAnalysis: true },
        });
        if (!caseMeta) {
          res.status(404).json({
            errorCode: "CASE_NOT_FOUND",
            error: "해당 글로벌 사례를 찾을 수 없습니다.",
          });
          return;
        }

        // Load project policy (ownership check)
        const policy = await prisma.projectPolicy.findFirst({
          where: { id: projectPolicyId, userId },
        });
        if (!policy) {
          res.status(404).json({
            errorCode: "PROJECT_NOT_FOUND",
            error: "프로젝트를 찾을 수 없습니다.",
          });
          return;
        }

        const currentBalance = await getCreditBalance(prisma, userId);
        if (currentBalance === null || currentBalance < blueprintCost) {
          respondInsufficientCredits(res, {
            feature: "Blueprint",
            required: blueprintCost,
            creditBalance: currentBalance,
          });
          return;
        }

        console.log(
          `\n📝 Blueprint 요청: ${caseMeta.companyName} → 한국형 전략`
        );

        // Build prompt and call Groq
        const budgetWon = Math.round(budget / 10000);
        const prompt = buildBlueprintPrompt(
          caseMeta,
          policy,
          budgetWon,
          targetMarket,
          caseMeta.deepAnalysis ?? undefined
        );

        console.log(`   [1/2] Groq 전략 생성 중..`);
        const primaryBlueprintModel = process.env.GROQ_IDEA_MODEL ?? "llama-3.3-70b-versatile";
        const fallbackBlueprintModel = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
        let blueprintResult: Awaited<ReturnType<typeof groq.chat.completions.create>>;
        try {
          blueprintResult = await groq.chat.completions.create({
            model: primaryBlueprintModel,
            max_tokens: 4096,
            temperature: 0.7,
            messages: [{ role: "user", content: prompt }],
          });
        } catch (primaryErr: any) {
          const isRateLimit = primaryErr?.status === 413 || primaryErr?.status === 429 ||
            primaryErr?.message?.includes("rate_limit") || primaryErr?.message?.includes("Request too large");
          if (!isRateLimit) throw primaryErr;
          console.warn(`   [1/2] ⚠️ primary model rate limit, fallback to scout`);
          blueprintResult = await groq.chat.completions.create({
            model: fallbackBlueprintModel,
            max_tokens: 4096,
            temperature: 0.7,
            messages: [{ role: "user", content: prompt }],
          });
        }
        const result = blueprintResult;
        const raw = (result.choices[0].message.content ?? "")
          .replace(/^```[a-z]*\n?/i, "")
          .replace(/```$/, "")
          .trim();

        let analysis: any;
        try {
          analysis = JSON.parse(raw);
        } catch {
          console.error(`   [1/2] ❌ JSON 파싱 실패. Raw:\n${raw.substring(0, 300)}`);
          res.status(502).json({
            errorCode: "LLM_PARSE_ERROR",
            error: "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        console.log(
          `   [1/2] 전략 생성 완료 (실현가능성: ${analysis.feasibilityScore ?? "?"})`
        );

        // Save to DB with transaction
        console.log(`   [2/2] DB 저장 중..`);
        const persisted = await prisma.$transaction(async (tx) => {
          const creditResult = await consumeCredits(
            tx,
            userId,
            blueprintCost,
            "blueprint"
          );
          if (!creditResult) return null;

          const blueprint = await tx.kBlueprint.create({
            data: {
              feasibilityScore: clamp(analysis.feasibilityScore ?? 50, 0, 100),
              regulations: analysis.regulations ?? null,
              localization: analysis.localization ?? null,
              altDesign: analysis.altDesign ?? null,
              projectPolicyId,
              globalCaseMetaId: globalCaseId,
            },
          });

          return { blueprint, balanceAfter: creditResult.balanceAfter };
        });

        if (!persisted) {
          respondCreditConflict(res, {
            feature: "Blueprint",
            required: blueprintCost,
          });
          return;
        }

        console.log(
          `   [2/2] ✅ 완료 (blueprintId: ${persisted.blueprint.id}, 실현가능성: ${persisted.blueprint.feasibilityScore})`
        );

        res.json({
          blueprintId: persisted.blueprint.id,
          feasibilityScore: persisted.blueprint.feasibilityScore,
          benchmarkCase: {
            companyName: caseMeta.companyName,
            industry: caseMeta.industry,
            revenueModel: caseMeta.revenueModel,
          },
          creditUsed: blueprintCost,
          creditBalance: persisted.balanceAfter,
          analysis,
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
        handleRouteError(res, err, "Blueprint 오류");
      }
    }
  );
}
