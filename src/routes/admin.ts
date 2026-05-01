import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError, forbiddenError } from "../lib/http.js";
import { isAdminEmail } from "../lib/admin.js";
import { grantCredits } from "../lib/credits.js";

type RegisterAdminRoutesOptions = {
  prisma: PrismaClient;
};

/** 관리자 전용 미들웨어 — 이메일 기반 권한 확인 */
async function requireAdmin(
  req: Request,
  res: Response,
  next: () => void,
  _prisma: PrismaClient,
): Promise<void> {
  const { email } = getAuthedUser(req);

  if (!isAdminEmail(email)) {
    const err = forbiddenError("관리자 권한이 필요합니다.");
    res.status(403).json({ error: err.message });
    return;
  }

  next();
}

export function registerAdminRoutes(
  app: Express,
  { prisma }: RegisterAdminRoutesOptions,
): void {
  const adminGuard = (req: Request, res: Response, next: () => void) =>
    requireAdmin(req, res, next, prisma);

  /**
   * GET /api/admin/stats
   * 전체 서비스 현황 요약
   */
  app.get(
    "/api/admin/stats",
    requireAuth,
    adminGuard,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
          // 사용자
          totalUsers,
          recentUsers,
          totalExperts,
          // 콘텐츠
          totalProjects,
          totalIdeas,
          totalSelectedIdeas,
          totalBlueprints,
          totalCases,
          // 활동
          totalCommunityPosts,
          totalComments,
          totalLikes,
          totalMeetingNotes,
          // 워크스페이스
          totalWorkspaces,
          totalTasks,
          completedTasks,
          // 결제
          totalSubscriptions,
          activeSubscriptions,
          totalCreditUnlocks,
          // 최근 활동
          recentPosts,
          recentComments,
          recentMeetingNotes,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
          prisma.expertProfile.count({ where: { available: true } }),

          prisma.projectPolicy.count(),
          prisma.generatedIdea.count(),
          prisma.generatedIdea.count({ where: { status: "SELECTED" } }),
          prisma.kBlueprint.count(),
          prisma.globalCaseMeta.count(),

          prisma.communityPost.count(),
          prisma.postComment.count(),
          prisma.postLike.count(),
          prisma.meetingNote.count(),

          prisma.workspaceStage.findMany({ select: { ideaId: true }, distinct: ["ideaId"] }).then((rows) => rows.length),
          prisma.workspaceTask.count(),
          prisma.workspaceTask.count({
            where: { status: { in: ["DONE", "OUTSOURCED", "SKIPPED"] } },
          }),

          prisma.subscription.count(),
          prisma.subscription.count({ where: { active: true } }),
          prisma.userCaseUnlock.count(),

          prisma.communityPost.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
          prisma.postComment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
          prisma.meetingNote.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        ]);

        res.json({
          // 사용자
          totalUsers,
          recentUsers,
          totalExperts,
          // 콘텐츠
          totalProjects,
          totalIdeas,
          totalSelectedIdeas,
          totalBlueprints,
          totalIdeaSessions: totalProjects, // 호환성
          totalCases,
          // 활동
          totalCommunityPosts,
          totalComments,
          totalLikes,
          totalMeetingNotes,
          // 워크스페이스
          totalWorkspaces,
          totalTasks,
          completedTasks,
          // 결제
          totalSubscriptions,
          activeSubscriptions,
          totalCreditUnlocks,
          // 최근 (7일)
          recentPosts,
          recentComments,
          recentMeetingNotes,
        });
      } catch (err) {
        handleRouteError(res, err, "어드민 통계 조회 오류");
      }
    },
  );

  /**
   * GET /api/admin/users
   * 유저 목록 (페이징)
   */
  app.get(
    "/api/admin/users",
    requireAuth,
    adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = req.query.search as string | undefined;

        const where = search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" as const } },
                { name: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {};

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              name: true,
              userType: true,
              planType: true,
              creditBalance: true,
              createdAt: true,
              _count: {
                select: {
                  projectPolicies: true,
                },
              },
            },
          }),
          prisma.user.count({ where }),
        ]);

        res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
      } catch (err) {
        handleRouteError(res, err, "어드민 유저 목록 조회 오류");
      }
    },
  );

  /**
   * POST /api/admin/credits/grant
   * 특정 유저에게 크레딧 지급
   * body: { userId, amount, reason }
   */
  app.post(
    "/api/admin/credits/grant",
    requireAuth,
    adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId: targetUserId, amount, reason } = req.body;

        if (!targetUserId || typeof amount !== "number" || amount <= 0) {
          res.status(400).json({ error: "userId와 양수 amount가 필요합니다." });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: String(targetUserId) },
          select: { id: true, email: true, creditBalance: true },
        });

        if (!user) {
          res.status(404).json({ error: "유저를 찾을 수 없습니다." });
          return;
        }

        const newBalance = await grantCredits(
          prisma,
          user.id,
          amount,
          reason ?? "어드민 크레딧 지급",
        );

        res.json({ userId: user.id, email: user.email, newBalance, granted: amount });
      } catch (err) {
        handleRouteError(res, err, "어드민 크레딧 지급 오류");
      }
    },
  );

  /**
   * PATCH /api/admin/users/:id
   * 유저 속성 변경 (isAdmin, planType, userType)
   */
  app.patch(
    "/api/admin/users/:id",
    requireAuth,
    adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const targetId = String(req.params.id);
        const { planType, userType } = req.body;

        const updateData: Record<string, unknown> = {};
        if (planType) updateData.planType = planType;
        if (userType) updateData.userType = userType;

        if (Object.keys(updateData).length === 0) {
          res.status(400).json({ error: "변경할 항목이 없습니다." });
          return;
        }

        const updated = await prisma.user.update({
          where: { id: targetId },
          data: updateData,
          select: { id: true, email: true, name: true, planType: true, userType: true },
        });

        res.json(updated);
      } catch (err) {
        handleRouteError(res, err, "어드민 유저 수정 오류");
      }
    },
  );

  /**
   * GET /api/admin/cases
   * 글로벌 케이스 목록 (페이징)
   */
  app.get(
    "/api/admin/cases",
    requireAuth,
    adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const search = req.query.search as string | undefined;

        const where = search
          ? {
              OR: [
                { companyName: { contains: search, mode: "insensitive" as const } },
                { industry: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {};

        const [cases, total] = await Promise.all([
          prisma.globalCaseMeta.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              companyName: true,
              industry: true,
              targetMarket: true,
              fundingStage: true,
              dataQualityScore: true,
              isActive: true,
              createdAt: true,
            },
          }),
          prisma.globalCaseMeta.count({ where }),
        ]);

        res.json({ cases, total, page, totalPages: Math.ceil(total / limit) });
      } catch (err) {
        handleRouteError(res, err, "어드민 케이스 목록 조회 오류");
      }
    },
  );

  /**
   * DELETE /api/admin/users/:id
   * 유저 삭제 (관련 데이터 cascade)
   */
  app.delete(
    "/api/admin/users/:id",
    requireAuth,
    adminGuard,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId: adminId } = getAuthedUser(req);
        const targetId = String(req.params.id);

        if (adminId === targetId) {
          res.status(400).json({ error: "자기 자신은 삭제할 수 없습니다." });
          return;
        }

        await prisma.user.delete({ where: { id: targetId } });
        res.json({ deleted: true });
      } catch (err) {
        handleRouteError(res, err, "어드민 유저 삭제 오류");
      }
    },
  );
}
