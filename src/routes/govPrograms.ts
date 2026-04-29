import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
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
  GOV_PROGRAMS,
  findProgramById,
  scoreProgram,
} from "../data/govPrograms.js";

const CREDIT_COST_DRAFT = 3; // 신청서 자동 작성 1회당 크레딧

export function registerGovProgramRoutes(
  app: Express,
  { prisma, groq }: { prisma: PrismaClient; groq: Groq },
): void {
  /**
   * 전체 정부지원사업 목록 (공개)
   */
  app.get("/api/gov-programs", (_req: Request, res: Response) => {
    res.json({ programs: GOV_PROGRAMS, total: GOV_PROGRAMS.length });
  });

  /**
   * 단일 사업 조회
   */
  app.get("/api/gov-programs/:id", (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const program = findProgramById(id);
    if (!program) {
      res.status(404).json({ error: "프로그램을 찾을 수 없습니다." });
      return;
    }
    res.json(program);
  });

  /**
   * 아이디어 기반 매칭
   * GET /api/ideas/:ideaId/gov-programs
   */
  app.get(
    "/api/ideas/:ideaId/gov-programs",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;

        const idea = await prisma.generatedIdea.findUnique({ where: { id: ideaId } });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }
        const session = await prisma.ideaMatchSession.findUnique({ where: { id: idea.sessionId } });
        if (!session) {
          res.status(404).json({ error: "세션을 찾을 수 없습니다." });
          return;
        }
        const project = await prisma.projectPolicy.findUnique({ where: { id: session.projectPolicyId } });
        if (!project || project.userId !== userId) {
          res.status(403).json({ error: "접근 권한이 없습니다." });
          return;
        }
        const ideaText = `${idea.titleKo ?? ""} ${idea.oneLinerKo ?? ""} ${idea.summaryKo ?? ""}`;
        const lower = ideaText.toLowerCase();

        // 키워드 추출 (간단 규칙 기반)
        const keywordRules: Record<string, string[]> = {
          AI: ["ai", "인공지능", "머신러닝", "딥러닝", "llm", "gpt"],
          SaaS: ["saas", "구독", "월정액"],
          BioTech: ["bio", "바이오", "헬스케어", "의료"],
          FinTech: ["fintech", "핀테크", "금융", "결제", "송금"],
          소셜벤처: ["사회", "환경", "esg", "교육", "장애"],
          글로벌: ["글로벌", "수출", "해외", "북미", "동남아"],
          청년창업: ["청년", "youth"],
          여성창업: ["여성", "맘", "엄마"],
          B2C: ["소비자", "b2c", "고객"],
          B2B: ["b2b", "기업", "사업자"],
        };
        const detectedKeywords = Object.entries(keywordRules)
          .filter(([, words]) => words.some((w) => lower.includes(w)))
          .map(([kw]) => kw);

        const targetMarket = (project.targetMarket as "B2B" | "B2C" | "B2B2C") ?? "B2C";

        // 매칭 점수 계산
        const matched = GOV_PROGRAMS
          .map((p) => {
            const result = scoreProgram(p, {
              foundingYears: 0,
              industries: Array.isArray(project.industries) ? (project.industries as string[]) : [],
              targetMarket,
              isCorporation: false,
              bestForKeywords: detectedKeywords,
            });
            return {
              program: p,
              score: result.score,
              matchReasons: result.reasons,
              missingRequirements: result.missing,
            };
          })
          .filter((m) => m.score >= 30)
          .sort((a, b) => b.score - a.score);

        const totalAmountKRW = matched.reduce((sum, m) => sum + m.program.amount.max, 0);

        res.json({
          ideaId,
          detectedKeywords,
          targetMarket,
          matchedCount: matched.length,
          totalAmountKRW,
          matches: matched,
        });
      } catch (err) {
        handleRouteError(res, err, "정부지원사업 매칭 오류");
      }
    },
  );

  /**
   * AI 신청서 자동 작성 (크레딧 소모)
   * POST /api/ideas/:ideaId/gov-programs/:programId/draft
   */
  app.post(
    "/api/ideas/:ideaId/gov-programs/:programId/draft",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;
        const programId = Array.isArray(req.params.programId) ? req.params.programId[0] : req.params.programId;

        const program = findProgramById(programId);
        if (!program) {
          res.status(404).json({ error: "프로그램을 찾을 수 없습니다." });
          return;
        }

        const idea = await prisma.generatedIdea.findUnique({ where: { id: ideaId } });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }
        const session = await prisma.ideaMatchSession.findUnique({ where: { id: idea.sessionId } });
        if (!session) {
          res.status(404).json({ error: "세션을 찾을 수 없습니다." });
          return;
        }
        const project = await prisma.projectPolicy.findUnique({ where: { id: session.projectPolicyId } });
        if (!project || project.userId !== userId) {
          res.status(403).json({ error: "접근 권한이 없습니다." });
          return;
        }

        const balance = await getCreditBalance(prisma, userId);
        if (balance === null || balance < CREDIT_COST_DRAFT) {
          respondInsufficientCredits(res, {
            feature: "정부지원사업 신청서 자동 작성",
            required: CREDIT_COST_DRAFT,
            creditBalance: balance,
          });
          return;
        }

        // 프롬프트 구성 — 모든 섹션을 한번에 생성
        const ideaContext = {
          title: idea.titleKo,
          oneLiner: idea.oneLinerKo,
          summary: idea.summaryKo,
          whyNow: idea.whyNowInKoreaKo,
          targetCustomer: idea.targetCustomer,
          businessModel: idea.businessModel,
          mvpScope: idea.mvpScope,
          executionPlan: idea.executionPlan,
          estimatedCost: idea.estimatedCost,
          risks: idea.risks,
          marketFitScore: idea.marketFitScore,
        };

        const sectionList = program.applicationFormSections
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n");

        const prompt = `당신은 한국 정부지원사업 신청서 작성 전문 컨설턴트입니다.

다음 아이디어 데이터를 기반으로 "${program.name}" 신청서를 자동 작성합니다.

=== 사업 정보 ===
- 프로그램명: ${program.name}
- 주관 기관: ${program.agency}
- 지원 금액: 최대 ${program.amount.max.toLocaleString("ko-KR")}원
- 사업 기간: ${program.durationMonths}개월
- 자격 요건: ${program.eligibility.notes ?? "별도 명시 없음"}

=== 신청서 섹션 ===
${sectionList}

=== 아이디어 데이터 ===
${JSON.stringify(ideaContext, null, 2)}

=== 작성 가이드 ===
1. 각 섹션은 한국어로 800~1500자 분량의 정성스러운 본문을 작성합니다.
2. 평가 위원이 읽었을 때 차별성·실현가능성·성장성이 명확히 드러나야 합니다.
3. 정량 지표(예: TAM, KPI, 매출 목표)를 적극 인용합니다. 단, 데이터가 없는 수치를 임의로 만들면 안 됩니다.
4. "${program.name}" 사업 취지에 부합하도록 톤과 키워드를 조정합니다.
5. 주관 기관(${program.agency})에서 자주 보는 단어와 표현을 사용합니다.
6. 최종 출력은 반드시 다음 JSON 형식이어야 합니다 (다른 텍스트 금지):

{
  "sections": [
    { "title": "섹션 제목", "content": "본문 내용" },
    ...
  ],
  "overallTone": "신청서 전체 톤 한 줄 요약",
  "submitChecklist": ["제출 전 확인사항 1", "확인사항 2", ...]
}`;

        const primaryModel = process.env.GROQ_IDEA_MODEL ?? "llama-3.3-70b-versatile";
        const result = await groq.chat.completions.create({
          model: primaryModel,
          max_tokens: 8192,
          temperature: 0.6,
          messages: [
            {
              role: "system",
              content:
                "You are an expert Korean government grant application writer. Always respond with valid JSON only, no markdown.",
            },
            { role: "user", content: prompt },
          ],
        });

        const raw = (result.choices[0].message.content ?? "")
          .replace(/^```[a-z]*\n?/i, "")
          .replace(/```$/, "")
          .trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          res.status(502).json({
            errorCode: "LLM_PARSE_ERROR",
            error: "AI 응답 파싱 실패. 다시 시도해주세요.",
          });
          return;
        }

        // 크레딧 차감
        const persisted = await prisma.$transaction(async (tx) => {
          const credit = await consumeCredits(tx, userId, CREDIT_COST_DRAFT, `gov-draft:${programId}`);
          return credit;
        });

        if (!persisted) {
          respondCreditConflict(res, {
            feature: "정부지원사업 신청서 자동 작성",
            required: CREDIT_COST_DRAFT,
          });
          return;
        }

        res.json({
          program,
          ideaId,
          draft: parsed,
          generatedAt: new Date().toISOString(),
          creditUsed: CREDIT_COST_DRAFT,
          creditBalance: persisted.balanceAfter,
        });
      } catch (err) {
        handleRouteError(res, err, "신청서 자동 작성 오류");
      }
    },
  );
}
