import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";

export function registerOfficeRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* ─── GET /api/office/buildings ─────────────────────
     Widea Valley — 도시 맵에 표시할 모든 SELECTED 워크스페이스(=빌딩) 목록.
     각 빌딩은 방문 가능 여부(canEnter: 내가 owner/member일 때 true) 포함. */
  app.get(
    "/api/office/buildings",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);

        const ideas = await prisma.generatedIdea.findMany({
          where: { status: "SELECTED" },
          select: {
            id: true,
            titleKo: true,
            session: { select: { projectPolicy: { select: { userId: true, user: { select: { name: true, email: true } } } } } },
            workspaceMembers: { select: { userId: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        const buildings = ideas.map((i) => {
          const ownerId = i.session.projectPolicy.userId;
          const ownerName = i.session.projectPolicy.user?.name ?? i.session.projectPolicy.user?.email?.split("@")[0] ?? "owner";
          const memberIds = new Set([ownerId, ...i.workspaceMembers.map((m) => m.userId)]);
          const canEnter = memberIds.has(userId);
          return {
            ideaId: i.id,
            titleKo: i.titleKo,
            ownerName,
            memberCount: memberIds.size,
            canEnter,
          };
        });

        res.json({ buildings });
      } catch (err) {
        handleRouteError(res, err, "도시 빌딩 목록 오류");
      }
    },
  );
}
