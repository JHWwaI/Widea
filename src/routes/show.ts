import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { handleRouteError } from "../lib/http.js";

/**
 * /api/show/:ideaId — 비로그인 공개 read-only.
 * 사업의 핵심 정보만 노출 (PII 없음).
 */
export function registerShowRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  app.get(
    "/api/show/:ideaId",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const ideaId = String(req.params.ideaId);

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          select: {
            id: true,
            titleKo: true,
            oneLinerKo: true,
            summaryKo: true,
            whyNowInKoreaKo: true,
            mvpScope: true,
            sourceBenchmarks: true,
            similarityScore: true,
            deepReportKo: true,
            artifactsKo: true,
            createdAt: true,
            // 의도적으로 노출 안함: rawIdea, planData, deepReportUnlocked, requiresCredit
          },
        });

        if (!idea) {
          res.status(404).json({ error: "찾을 수 없습니다." });
          return;
        }

        // 워크스페이스 진척 (있으면)
        const stages = await prisma.workspaceStage.findMany({
          where: { ideaId: idea.id },
          orderBy: { stageNumber: "asc" },
          select: {
            stageNumber: true,
            name: true,
            status: true,
            tasks: {
              select: { status: true },
            },
          },
        });

        const totalTasks = stages.reduce((acc, s) => acc + s.tasks.length, 0);
        const doneTasks = stages.reduce(
          (acc, s) => acc + s.tasks.filter((t) => t.status !== "PENDING").length,
          0,
        );
        const overallPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

        // 첫 매칭 벤치마크 (이름·유사도)
        const sb = Array.isArray(idea.sourceBenchmarks)
          ? (idea.sourceBenchmarks as Array<{ companyName?: string; score?: number }>)
          : [];
        const topBench = sb[0] ?? null;

        // hookLine 추출
        const dr = (idea.deepReportKo ?? null) as { hookLine?: string } | null;
        const hookLine = dr?.hookLine ?? null;

        // MVP 기능 (artifacts 또는 mvpScope에서)
        const mvpScope = (idea.mvpScope ?? null) as
          | { coreFeatures?: string[]; features?: string[] }
          | null;
        const mvpFeatures = Array.isArray(mvpScope?.coreFeatures)
          ? mvpScope.coreFeatures
          : Array.isArray(mvpScope?.features)
            ? mvpScope.features
            : [];

        res.json({
          idea: {
            id: idea.id,
            titleKo: idea.titleKo,
            oneLinerKo: idea.oneLinerKo,
            summaryKo: idea.summaryKo,
            whyNowInKoreaKo: idea.whyNowInKoreaKo,
            createdAt: idea.createdAt,
          },
          mvpFeatures,
          benchmark: topBench
            ? {
                companyName: topBench.companyName ?? null,
                similarityPct:
                  typeof topBench.score === "number"
                    ? Math.round(topBench.score * 100)
                    : typeof idea.similarityScore === "number"
                      ? Math.round(idea.similarityScore * 100)
                      : null,
              }
            : null,
          hookLine,
          progress: {
            overallPct,
            doneTasks,
            totalTasks,
            stages: stages.map((s) => ({
              stageNumber: s.stageNumber,
              name: s.name,
              status: s.status,
              taskTotal: s.tasks.length,
              taskDone: s.tasks.filter((t) => t.status !== "PENDING").length,
            })),
          },
        });
      } catch (err) {
        handleRouteError(res, err, "Show 페이지 오류");
      }
    },
  );
}
