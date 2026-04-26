import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { consumeCredits, getCreditBalance } from "../lib/credits.js";
import {
  getAuthedUser,
  handleRouteError,
  respondCreditConflict,
  respondInsufficientCredits,
} from "../lib/http.js";
import { searchSimilarCases } from "../lib/vectorDb.js";

// Discovery 검색: 1크레딧 (3개 결과 미리보기, 1개 공개)
// 케이스 잠금 해제: 2크레딧 (개별 케이스 전체 공개)
const CREDIT_COSTS = { discovery: 1, unlock: 2 };

// ── 공통 헬퍼: GlobalCaseMeta + deepAnalysis → 응답 객체 빌드 ────────────────
async function buildCasePayload(
  prisma: PrismaClient,
  vectorDbId: string,
  score: number,
  rank: number,
  locked: boolean
) {
  const meta = await prisma.globalCaseMeta.findUnique({
    where: { vectorDbId },
    include: { deepAnalysis: true },
  });

  if (!meta) {
    return {
      rank,
      similarityScore: Math.round(score * 10000) / 10000,
      locked,
      // Pinecone 메타데이터에서 최소한의 필드만
    };
  }

  // 조회수 비동기 증가
  prisma.globalCaseMeta
    .update({ where: { id: meta.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const base = {
    rank,
    similarityScore: Math.round(score * 10000) / 10000,
    caseId:                meta.id,
    companyName:           meta.companyName,
    shortDescription:      meta.shortDescription,
    industry:              meta.industry,
    targetMarket:          meta.targetMarket,
    locked,
  };

  // 잠긴 결과는 최소 정보만 반환 (블러 처리용 티저)
  if (locked) return base;

  const da = meta.deepAnalysis;
  return {
    ...base,
    foundedYear:           meta.foundedYear,
    fundingStage:          meta.fundingStage,
    revenueModel:          meta.revenueModel,
    geographicOrigin:      meta.geographicOrigin,
    growthStage:           meta.growthStage,
    isActive:              meta.isActive,
    koreaPresence:         meta.koreaPresence,
    estimatedARR:          meta.estimatedARR,
    targetCustomerProfile: meta.targetCustomerProfile,
    teamSizeAtLaunch:      meta.teamSizeAtLaunch,
    regulatoryComplexity:  meta.regulatoryComplexity,
    tags:                  meta.tags,
    difficultyLevel:       meta.difficultyLevel,
    minCapitalKRW:         meta.minCapitalKRW?.toString() ?? null,
    dataQualityScore:      meta.dataQualityScore,
    companySource:         meta.companySource,
    analysis: da ? {
      problemStatement:     da.problemStatement,
      solutionCore:         da.solutionCore,
      initialWedge:         da.initialWedge,
      unfairAdvantage:      da.unfairAdvantage,
      unitEconomics:        da.unitEconomics,
      signatureMoves:       da.signatureMoves,
      koreaAdaptNotes:      da.koreaAdaptNotes,
      growthStory:          da.growthStory,
      technologyDNA:        da.technologyDNA,
      founderDNA:           da.founderDNA,
      koreaStrategy:        da.koreaStrategy,
      replicationGuide:     da.replicationGuide,
      marketTiming:         da.marketTiming,
      competitiveLandscape: da.competitiveLandscape,
      revenueDeepDive:      da.revenueDeepDive,
      networkEffects:       da.networkEffects,
      expansionPlaybook:    da.expansionPlaybook,
      investorPOV:          da.investorPOV,
    } : null,
  };
}

export function registerDiscoveryRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient }
): void {

  // ── POST /api/discovery ─────────────────────────────────────────────────────
  // 항상 3개 결과 반환: rank 1 = 공개, rank 2~3 = 잠금 (블러 처리)
  // 단, 해당 케이스를 이미 잠금 해제한 경우 공개로 반환
  // 비용: 1크레딧
  app.post(
    "/api/discovery",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const discoveryCost = CREDIT_COSTS.discovery;

        const { keyword, targetMarket } = req.body as {
          keyword?: string;
          targetMarket?: string;
        };

        if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
          res.status(400).json({
            errorCode: "VALIDATION_ERROR",
            error: "keyword는 필수입니다.",
          });
          return;
        }

        const currentBalance = await getCreditBalance(prisma, userId);
        if (currentBalance === null || currentBalance < discoveryCost) {
          respondInsufficientCredits(res, {
            feature: "Discovery",
            required: discoveryCost,
            creditBalance: currentBalance,
          });
          return;
        }

        console.log(`\n🔍 Discovery: "${keyword.trim()}" (topK=3)`);

        // 벡터 유사도 검색 — 항상 3개
        const vectorResults = await searchSimilarCases(
          keyword.trim(),
          3,
          targetMarket || undefined
        );

        // 사용자의 이미 잠금 해제된 케이스 목록 조회
        const existingUnlocks = vectorResults.length > 0
          ? await prisma.userCaseUnlock.findMany({
              where: { userId },
              select: { caseId: true },
            })
          : [];
        const unlockedIds = new Set(existingUnlocks.map((u) => u.caseId));

        // 결과 빌드: rank 1은 항상 공개, rank 2~3은 이미 unlock 된 경우만 공개
        const results = await Promise.all(
          vectorResults.map(async (r, idx) => {
            const rank = idx + 1;
            // rank 1이거나 이미 unlock된 케이스는 공개
            // 먼저 meta id 확인이 필요하므로 caseId 기준으로 체크
            const meta = await prisma.globalCaseMeta.findUnique({
              where: { vectorDbId: r.metadata.dbId },
              select: { id: true },
            });
            const isUnlocked = rank === 1 || (meta ? unlockedIds.has(meta.id) : false);
            return buildCasePayload(
              prisma,
              r.metadata.dbId,
              r.score,
              rank,
              !isUnlocked
            );
          })
        );

        const creditResult = await consumeCredits(
          prisma,
          userId,
          discoveryCost,
          "discovery"
        );
        if (!creditResult) {
          respondCreditConflict(res, { feature: "Discovery", required: discoveryCost });
          return;
        }

        console.log(`   ✅ ${results.length}건 반환 (공개: ${results.filter((r) => !(r as { locked?: boolean }).locked).length})`);

        res.json({
          keyword:        keyword.trim(),
          matchCount:     results.length,
          totalCasesInDB: await prisma.globalCaseMeta.count(),
          results,
          credit: { used: discoveryCost, balance: creditResult.balanceAfter },
        });
      } catch (err) {
        handleRouteError(res, err, "Discovery 오류");
      }
    }
  );

  // ── POST /api/discovery/unlock ──────────────────────────────────────────────
  // 잠긴 케이스 잠금 해제 (2크레딧)
  // 이미 잠금 해제된 경우 무료로 재반환
  app.post(
    "/api/discovery/unlock",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const { caseId } = req.body as { caseId?: string };

        if (!caseId || typeof caseId !== "string") {
          res.status(400).json({ errorCode: "VALIDATION_ERROR", error: "caseId는 필수입니다." });
          return;
        }

        const meta = await prisma.globalCaseMeta.findUnique({
          where: { id: caseId },
          include: { deepAnalysis: true },
        });
        if (!meta) {
          res.status(404).json({ errorCode: "NOT_FOUND", error: "케이스를 찾을 수 없습니다." });
          return;
        }

        // 이미 잠금 해제된 경우 크레딧 소모 없이 반환
        const existing = await prisma.userCaseUnlock.findUnique({
          where: { userId_caseId: { userId, caseId } },
        });

        let creditBalance: number | null = await getCreditBalance(prisma, userId);

        if (!existing) {
          const unlockCost = CREDIT_COSTS.unlock;
          if (creditBalance === null || creditBalance < unlockCost) {
            respondInsufficientCredits(res, {
              feature: "케이스 잠금 해제",
              required: unlockCost,
              creditBalance,
            });
            return;
          }

          const creditResult = await consumeCredits(prisma, userId, unlockCost, "discovery-unlock");
          if (!creditResult) {
            respondCreditConflict(res, { feature: "케이스 잠금 해제", required: unlockCost });
            return;
          }

          await prisma.userCaseUnlock.create({ data: { userId, caseId } });
          creditBalance = creditResult.balanceAfter;

          console.log(`🔓 Unlock: userId=${userId} caseId=${caseId} (${meta.companyName})`);
        }

        // 조회수 증가
        prisma.globalCaseMeta
          .update({ where: { id: caseId }, data: { viewCount: { increment: 1 } } })
          .catch(() => {});

        const da = meta.deepAnalysis;
        res.json({
          caseId:                meta.id,
          companyName:           meta.companyName,
          shortDescription:      meta.shortDescription,
          industry:              meta.industry,
          foundedYear:           meta.foundedYear,
          fundingStage:          meta.fundingStage,
          revenueModel:          meta.revenueModel,
          targetMarket:          meta.targetMarket,
          geographicOrigin:      meta.geographicOrigin,
          growthStage:           meta.growthStage,
          isActive:              meta.isActive,
          koreaPresence:         meta.koreaPresence,
          estimatedARR:          meta.estimatedARR,
          targetCustomerProfile: meta.targetCustomerProfile,
          teamSizeAtLaunch:      meta.teamSizeAtLaunch,
          regulatoryComplexity:  meta.regulatoryComplexity,
          tags:                  meta.tags,
          difficultyLevel:       meta.difficultyLevel,
          minCapitalKRW:         meta.minCapitalKRW?.toString() ?? null,
          dataQualityScore:      meta.dataQualityScore,
          companySource:         meta.companySource,
          analysis: da ? {
            problemStatement:     da.problemStatement,
            solutionCore:         da.solutionCore,
            initialWedge:         da.initialWedge,
            unfairAdvantage:      da.unfairAdvantage,
            unitEconomics:        da.unitEconomics,
            signatureMoves:       da.signatureMoves,
            koreaAdaptNotes:      da.koreaAdaptNotes,
            growthStory:          da.growthStory,
            technologyDNA:        da.technologyDNA,
            founderDNA:           da.founderDNA,
            koreaStrategy:        da.koreaStrategy,
            replicationGuide:     da.replicationGuide,
            marketTiming:         da.marketTiming,
            competitiveLandscape: da.competitiveLandscape,
            revenueDeepDive:      da.revenueDeepDive,
            networkEffects:       da.networkEffects,
            expansionPlaybook:    da.expansionPlaybook,
            investorPOV:          da.investorPOV,
          } : null,
          alreadyUnlocked: !!existing,
          credit: { balance: creditBalance, used: existing ? 0 : CREDIT_COSTS.unlock },
        });
      } catch (err) {
        handleRouteError(res, err, "케이스 잠금 해제 오류");
      }
    }
  );

  // ── GET /api/discovery/case/:id ─────────────────────────────────────────────
  // 단일 케이스 상세 조회 (잠금 해제 여부 확인 포함, 크레딧 미소모)
  app.get(
    "/api/discovery/case/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const { id } = req.params;

        const meta = await prisma.globalCaseMeta.findUnique({
          where: { id },
          include: { deepAnalysis: true },
        });

        if (!meta) {
          res.status(404).json({ errorCode: "NOT_FOUND", error: "케이스를 찾을 수 없습니다." });
          return;
        }

        // 잠금 해제 여부 확인
        const unlock = await prisma.userCaseUnlock.findUnique({
          where: { userId_caseId: { userId, caseId: id } },
        });

        prisma.globalCaseMeta
          .update({ where: { id }, data: { viewCount: { increment: 1 } } })
          .catch(() => {});

        const da = meta.deepAnalysis;
        res.json({
          caseId:                meta.id,
          companyName:           meta.companyName,
          shortDescription:      meta.shortDescription,
          industry:              meta.industry,
          targetMarket:          meta.targetMarket,
          locked:                !unlock,
          ...(unlock ? {
            foundedYear:           meta.foundedYear,
            fundingStage:          meta.fundingStage,
            revenueModel:          meta.revenueModel,
            geographicOrigin:      meta.geographicOrigin,
            growthStage:           meta.growthStage,
            isActive:              meta.isActive,
            koreaPresence:         meta.koreaPresence,
            estimatedARR:          meta.estimatedARR,
            targetCustomerProfile: meta.targetCustomerProfile,
            teamSizeAtLaunch:      meta.teamSizeAtLaunch,
            regulatoryComplexity:  meta.regulatoryComplexity,
            tags:                  meta.tags,
            difficultyLevel:       meta.difficultyLevel,
            minCapitalKRW:         meta.minCapitalKRW?.toString() ?? null,
            dataQualityScore:      meta.dataQualityScore,
            companySource:         meta.companySource,
            analysis: da ? {
              problemStatement:     da.problemStatement,
              solutionCore:         da.solutionCore,
              initialWedge:         da.initialWedge,
              unfairAdvantage:      da.unfairAdvantage,
              unitEconomics:        da.unitEconomics,
              signatureMoves:       da.signatureMoves,
              koreaAdaptNotes:      da.koreaAdaptNotes,
              growthStory:          da.growthStory,
              technologyDNA:        da.technologyDNA,
              founderDNA:           da.founderDNA,
              koreaStrategy:        da.koreaStrategy,
              replicationGuide:     da.replicationGuide,
              marketTiming:         da.marketTiming,
              competitiveLandscape: da.competitiveLandscape,
              revenueDeepDive:      da.revenueDeepDive,
              networkEffects:       da.networkEffects,
              expansionPlaybook:    da.expansionPlaybook,
              investorPOV:          da.investorPOV,
            } : null,
          } : {}),
        });
      } catch (err) {
        handleRouteError(res, err, "케이스 상세 조회 오류");
      }
    }
  );
}
