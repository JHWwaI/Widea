import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";

/**
 * GET /api/activity — 내가 한 활동 (글·댓글·좋아요·외주 게시) 통합 피드
 */
export function registerActivityRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  app.get(
    "/api/activity",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 30)));

        const [posts, comments, likes] = await Promise.all([
          prisma.communityPost.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: { id: true, title: true, category: true, createdAt: true, viewCount: true,
              _count: { select: { comments: true, likes: true } },
            },
          }),
          prisma.postComment.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
              post: { select: { id: true, title: true, category: true } },
            },
          }),
          prisma.postLike.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
              post: { select: { id: true, title: true, category: true } },
            },
          }),
        ]);

        // 통합 피드 — 시간 순서로 정렬
        type Item =
          | {
              type: "post";
              id: string;
              at: string;
              post: { id: string; title: string; category: string };
              meta: { viewCount: number; comments: number; likes: number };
            }
          | {
              type: "comment";
              id: string;
              at: string;
              post: { id: string; title: string; category: string };
              content: string;
            }
          | {
              type: "like";
              id: string;
              at: string;
              post: { id: string; title: string; category: string };
            };

        const items: Item[] = [];
        for (const p of posts) {
          items.push({
            type: "post",
            id: p.id,
            at: p.createdAt.toISOString(),
            post: { id: p.id, title: p.title, category: p.category },
            meta: { viewCount: p.viewCount, comments: p._count.comments, likes: p._count.likes },
          });
        }
        for (const c of comments) {
          if (!c.post) continue;
          items.push({
            type: "comment",
            id: c.id,
            at: c.createdAt.toISOString(),
            post: { id: c.post.id, title: c.post.title, category: c.post.category },
            content: c.content,
          });
        }
        for (const l of likes) {
          if (!l.post) continue;
          items.push({
            type: "like",
            id: l.id,
            at: l.createdAt.toISOString(),
            post: { id: l.post.id, title: l.post.title, category: l.post.category },
          });
        }

        items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        res.json({
          items: items.slice(0, limit),
          counts: {
            posts: posts.length,
            comments: comments.length,
            likes: likes.length,
          },
        });
      } catch (err) {
        handleRouteError(res, err, "활동 피드 조회 오류");
      }
    },
  );
}
