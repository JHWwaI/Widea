import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";

/**
 * 인박스: 내 게시글에 달린 댓글 + 내가 받은 좋아요를 모아 보여준다.
 * 단순 MVP — "읽음" 상태는 lastSeenInbox(User 필드)로 추후 추가 가능.
 */
export function registerInboxRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* GET /api/inbox — 최근 30일 내 받은 댓글·좋아요 (페이징 X, 최근 50건) */
  app.get(
    "/api/inbox",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30일

        // 내 게시글 IDs
        const myPosts = await prisma.communityPost.findMany({
          where: { authorId: userId },
          select: { id: true, title: true, category: true },
        });
        const myPostIds = myPosts.map((p) => p.id);
        const postMap = new Map(myPosts.map((p) => [p.id, p]));

        if (myPostIds.length === 0) {
          res.json({ comments: [], likes: [], total: 0 });
          return;
        }

        // 댓글 — 본인이 단 댓글 제외
        const comments = await prisma.postComment.findMany({
          where: {
            postId: { in: myPostIds },
            authorId: { not: userId },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        });

        // 좋아요 — 본인이 누른 거 제외
        const likes = await prisma.postLike.findMany({
          where: {
            postId: { in: myPostIds },
            userId: { not: userId },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });

        const enrichedComments = comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: c.author,
          post: postMap.get(c.postId),
        }));
        const enrichedLikes = likes.map((l) => ({
          id: l.id,
          createdAt: l.createdAt,
          user: l.user,
          post: postMap.get(l.postId),
        }));

        res.json({
          comments: enrichedComments,
          likes: enrichedLikes,
          total: enrichedComments.length + enrichedLikes.length,
        });
      } catch (err) {
        handleRouteError(res, err, "인박스 조회 오류");
      }
    },
  );

  /* GET /api/inbox/count — 최근 7일 내 받은 응답 개수 (mypage 배지용) */
  app.get(
    "/api/inbox/count",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const myPostIds = (
          await prisma.communityPost.findMany({
            where: { authorId: userId },
            select: { id: true },
          })
        ).map((p) => p.id);

        if (myPostIds.length === 0) {
          res.json({ count: 0 });
          return;
        }

        const [commentCount, likeCount] = await Promise.all([
          prisma.postComment.count({
            where: {
              postId: { in: myPostIds },
              authorId: { not: userId },
              createdAt: { gte: since },
            },
          }),
          prisma.postLike.count({
            where: {
              postId: { in: myPostIds },
              userId: { not: userId },
              createdAt: { gte: since },
            },
          }),
        ]);

        res.json({ count: commentCount + likeCount, comments: commentCount, likes: likeCount });
      } catch (err) {
        handleRouteError(res, err, "인박스 카운트 오류");
      }
    },
  );
}
