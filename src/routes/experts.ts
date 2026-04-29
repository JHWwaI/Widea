import { type Express, type Request, type Response } from "express";
import { type PrismaClient, Prisma, ExpertCategory } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";

const VALID_CATEGORIES: ExpertCategory[] = [
  "DEVELOPER",
  "DESIGNER",
  "MARKETER",
  "AC_MENTOR",
  "PLANNER",
  "PM",
  "OTHER",
];

export function registerExpertRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* ─── GET /api/experts ─────────────────────────────────
     전문가 카드 목록 (공개) — 카테고리·available 필터 + 페이징 */
  app.get("/api/experts", async (req: Request, res: Response): Promise<void> => {
    try {
      const category = String(req.query.category ?? "");
      const q = String(req.query.q ?? "").trim();
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
      const offset = Math.max(0, Number(req.query.offset ?? 0));

      const where: Prisma.ExpertProfileWhereInput = { available: true };
      if (VALID_CATEGORIES.includes(category as ExpertCategory)) {
        where.category = category as ExpertCategory;
      }
      if (q.length > 0) {
        where.OR = [
          { headline: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ];
      }

      const [experts, total] = await Promise.all([
        prisma.expertProfile.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }],
          take: limit,
          skip: offset,
        }),
        prisma.expertProfile.count({ where }),
      ]);

      // user 정보 조인 (이름·이메일)
      const userIds = experts.map((e) => e.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const data = experts.map((e) => ({
        ...e,
        user: userMap.get(e.userId) ?? null,
      }));

      res.json({ experts: data, total, limit, offset });
    } catch (err) {
      handleRouteError(res, err, "전문가 목록 조회 오류");
    }
  });

  /* ─── GET /api/experts/me ──────────────────────────────
     내 프로필 (없으면 null) */
  app.get(
    "/api/experts/me",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const profile = await prisma.expertProfile.findUnique({
          where: { userId },
        });
        res.json({ profile });
      } catch (err) {
        handleRouteError(res, err, "내 전문가 프로필 조회 오류");
      }
    },
  );

  /* ─── PUT /api/experts/me ──────────────────────────────
     내 프로필 등록·수정 (upsert) */
  app.put(
    "/api/experts/me",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const {
          category,
          headline,
          bio,
          skills,
          hourlyRateMin,
          hourlyRateMax,
          links,
          location,
          available,
        } = req.body ?? {};

        if (!VALID_CATEGORIES.includes(category)) {
          res.status(400).json({ error: "category가 유효하지 않습니다." });
          return;
        }
        if (typeof headline !== "string" || headline.trim().length < 5) {
          res.status(400).json({ error: "headline이 너무 짧습니다 (최소 5자)." });
          return;
        }
        if (typeof bio !== "string" || bio.trim().length < 10) {
          res.status(400).json({ error: "bio가 너무 짧습니다 (최소 10자)." });
          return;
        }

        const data = {
          category: category as ExpertCategory,
          headline: headline.trim(),
          bio: bio.trim(),
          skills: Array.isArray(skills) ? skills : [],
          hourlyRateMin:
            typeof hourlyRateMin === "number" && hourlyRateMin >= 0
              ? hourlyRateMin
              : null,
          hourlyRateMax:
            typeof hourlyRateMax === "number" && hourlyRateMax >= 0
              ? hourlyRateMax
              : null,
          links: Array.isArray(links) ? links : [],
          location: typeof location === "string" ? location : null,
          available: typeof available === "boolean" ? available : true,
        };

        const profile = await prisma.expertProfile.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });

        res.json({ profile });
      } catch (err) {
        handleRouteError(res, err, "전문가 프로필 저장 오류");
      }
    },
  );

  /* ─── DELETE /api/experts/me ───────────────────────────
     프로필 비공개 처리 = available false (소프트 삭제) */
  app.delete(
    "/api/experts/me",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const existing = await prisma.expertProfile.findUnique({
          where: { userId },
        });
        if (!existing) {
          res.json({ ok: true });
          return;
        }
        await prisma.expertProfile.update({
          where: { userId },
          data: { available: false },
        });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "전문가 프로필 비공개 오류");
      }
    },
  );

  /* ─── GET /api/experts/match ──────────────────────────
     task 컨텍스트로 전문가 추천 (스킬·헤드라인 키워드 매칭, 상위 N) */
  app.get("/api/experts/match", async (req: Request, res: Response): Promise<void> => {
    try {
      const query = String(req.query.q ?? "").toLowerCase().trim();
      const role = String(req.query.role ?? "").toLowerCase().trim();
      const category = String(req.query.category ?? "");
      const limit = Math.min(10, Math.max(1, Number(req.query.limit ?? 3)));

      const where: Prisma.ExpertProfileWhereInput = { available: true };
      if (VALID_CATEGORIES.includes(category as ExpertCategory)) {
        where.category = category as ExpertCategory;
      }

      const all = await prisma.expertProfile.findMany({ where, take: 100 });
      const userIds = all.map((e) => e.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      // 단어 분리 (한글 2자 이상, 영문 3자 이상)
      const tokens = `${query} ${role}`
        .split(/[\s,()·\/.\-—]+/)
        .map((t) => t.trim())
        .filter((t) => (t.length >= 2 && /[가-힣]/.test(t)) || t.length >= 3);

      const scored = all.map((e) => {
        const skills = (Array.isArray(e.skills) ? e.skills : []) as string[];
        const blob = `${e.headline} ${skills.join(" ")} ${e.bio.slice(0, 200)}`.toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (blob.includes(t)) score += 2;
          // 스킬 정확 일치는 가중치 더
          if (skills.some((s) => s.toLowerCase() === t)) score += 3;
        }
        return { expert: e, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const top = scored
        .filter((s) => s.score > 0)
        .slice(0, limit)
        .map((s) => ({ ...s.expert, user: userMap.get(s.expert.userId) ?? null, _score: s.score }));

      res.json({ experts: top });
    } catch (err) {
      handleRouteError(res, err, "전문가 매칭 추천 오류");
    }
  });

  /* ─── GET /api/experts/:userId ────────────────────────
     공개 프로필 상세 */
  app.get("/api/experts/:userId", async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = String(req.params.userId);
      const profile = await prisma.expertProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        res.status(404).json({ error: "프로필을 찾을 수 없습니다." });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      });
      // 조회수 증가 (실패해도 응답엔 영향 X)
      prisma.expertProfile
        .update({ where: { userId }, data: { viewCount: { increment: 1 } } })
        .catch(() => {});
      res.json({ profile, user });
    } catch (err) {
      handleRouteError(res, err, "전문가 프로필 상세 오류");
    }
  });
}
