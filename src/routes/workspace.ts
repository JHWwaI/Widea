import { type Express, type Request, type Response } from "express";
import { type PrismaClient, type Prisma } from "@prisma/client";
import multer from "multer";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { ensureWorkspaceForIdea } from "../lib/workspace.js";
import { geminiChat } from "../lib/geminiChat.js";
import { emitToWorkspace } from "../lib/realtime.js";

/** 단계 첨부 파일 — 25MB 제한, 메모리 보관 후 base64로 DB 저장 */
const stageFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function registerWorkspaceRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* ─── GET /api/workspace/all-tasks
     사이드바 [일정] 페이지용 — 내가 owner이거나 멤버인 모든 워크스페이스 task 통합 */
  app.get(
    "/api/workspace/all-tasks",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);

        // SELECTED idea만 — 종합 일정에는 본인이 선정해서 워크스페이스를 시작한 것만 보이게
        const ownedIdeas = await prisma.generatedIdea.findMany({
          where: { session: { projectPolicy: { userId } }, status: "SELECTED" },
          select: { id: true, titleKo: true },
        });
        const memberLinks = await prisma.ideaWorkspaceMember.findMany({
          where: { userId, idea: { status: "SELECTED" } },
          select: { idea: { select: { id: true, titleKo: true } } },
        });
        const ideaMap = new Map<string, { id: string; titleKo: string }>();
        for (const i of ownedIdeas) ideaMap.set(i.id, i);
        for (const m of memberLinks) if (!ideaMap.has(m.idea.id)) ideaMap.set(m.idea.id, m.idea);
        const ideaIds = Array.from(ideaMap.keys());

        if (ideaIds.length === 0) {
          res.json({ workspaces: [], tasks: [] });
          return;
        }

        // stages가 비어있는 idea는 자동으로 템플릿 시드 (사용자가 워크스페이스 페이지 한 번도 안 들어갔어도 OK)
        const existingStages = await prisma.workspaceStage.groupBy({
          by: ["ideaId"],
          where: { ideaId: { in: ideaIds } },
          _count: { _all: true },
        });
        const seededIds = new Set(existingStages.map((g) => g.ideaId));
        const missingIds = ideaIds.filter((id) => !seededIds.has(id));
        for (const mid of missingIds) {
          // 본인이 owner인 경우만 ensure (멤버는 X)
          const ownedIdea = ownedIdeas.find((i) => i.id === mid);
          if (ownedIdea) {
            try {
              await ensureWorkspaceForIdea(prisma, mid);
            } catch (e) {
              // race condition (다른 요청이 동시에 시드 중)이면 무시 — 다음 fetch에서 잡힘
              console.warn(`[all-tasks] ensure skip for ${mid}:`, (e as Error).message);
            }
          }
        }

        const stages = await prisma.workspaceStage.findMany({
          where: { ideaId: { in: ideaIds } },
          orderBy: { stageNumber: "asc" },
          include: {
            tasks: {
              orderBy: { orderIndex: "asc" },
              include: {
                assignee: { select: { id: true, name: true, email: true, userCode: true } },
              },
            },
          },
        });

        // task 평탄화: ideaId·title·stageNumber·stageName·task 합쳐서 반환
        const tasks = stages.flatMap((s) => {
          const idea = ideaMap.get(s.ideaId)!;
          return s.tasks.map((t) => ({
            id: t.id,
            stageId: t.stageId,
            ideaId: s.ideaId,
            ideaTitle: idea.titleKo,
            stageNumber: s.stageNumber,
            stageName: s.name,
            content: t.content,
            status: t.status,
            outsourceRole: t.outsourceRole,
            communityPostId: t.communityPostId,
            isCustom: t.isCustom,
            orderIndex: t.orderIndex,
            assigneeId: t.assigneeId,
            assignee: t.assignee,
            dueDate: t.dueDate,
            notes: t.notes,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            completedAt: t.completedAt,
          }));
        });

        const workspaces = Array.from(ideaMap.values()).map((i) => ({
          ideaId: i.id,
          title: i.titleKo,
        }));

        res.json({ workspaces, tasks });
      } catch (err) {
        handleRouteError(res, err, "전체 task 조회 오류");
      }
    },
  );

  /* ─── GET /api/workspace/my-list ──────────
     내가 owner이거나 멤버인 워크스페이스(아이디어) 목록 + 마지막 메시지.
     반드시 `/api/workspace/:ideaId` 보다 위에 등록 (그렇지 않으면 "my-list" 가 ideaId로 잡혀 404). */
  app.get(
    "/api/workspace/my-list",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);

        const ownedIdeas = await prisma.generatedIdea.findMany({
          where: { session: { projectPolicy: { userId } }, status: "SELECTED" },
          select: { id: true, titleKo: true, createdAt: true },
        });
        const memberLinks = await prisma.ideaWorkspaceMember.findMany({
          where: { userId, idea: { status: "SELECTED" } },
          select: { idea: { select: { id: true, titleKo: true, createdAt: true } } },
        });
        const ideaMap = new Map<string, { id: string; titleKo: string; createdAt: Date; isOwner: boolean }>();
        for (const i of ownedIdeas) {
          ideaMap.set(i.id, { id: i.id, titleKo: i.titleKo, createdAt: i.createdAt, isOwner: true });
        }
        for (const m of memberLinks) {
          if (!ideaMap.has(m.idea.id)) {
            ideaMap.set(m.idea.id, { ...m.idea, isOwner: false });
          }
        }
        const ideas = Array.from(ideaMap.values());

        const ideaIds = ideas.map((i) => i.id);
        const lastMessages = ideaIds.length
          ? await prisma.workspaceMessage.findMany({
              where: { ideaId: { in: ideaIds } },
              orderBy: { createdAt: "desc" },
              distinct: ["ideaId"],
              select: {
                ideaId: true,
                content: true,
                createdAt: true,
                author: { select: { id: true, name: true, email: true } },
              },
            })
          : [];
        const lastMap = new Map(lastMessages.map((m) => [m.ideaId, m]));

        const list = ideas
          .map((i) => ({
            ideaId: i.id,
            title: i.titleKo,
            isOwner: i.isOwner,
            lastMessage: lastMap.get(i.id) ?? null,
          }))
          .sort((a, b) => {
            const ta = a.lastMessage?.createdAt.getTime() ?? 0;
            const tb = b.lastMessage?.createdAt.getTime() ?? 0;
            return tb - ta;
          });

        res.json({ workspaces: list });
      } catch (err) {
        handleRouteError(res, err, "워크스페이스 목록 오류");
      }
    },
  );

  /* ─── GET /api/workspace/summaries ───────────────────────
     여러 아이디어 ID에 대한 진척 요약 (마이페이지용)
     쿼리: ?ideaIds=id1,id2,id3
     반드시 :ideaId 위에 등록 (그렇지 않으면 "summaries" 가 ideaId로 잡혀 404). */
  app.get(
    "/api/workspace/summaries",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const idsParam = String(req.query.ideaIds ?? "");
        const ideaIds = idsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (ideaIds.length === 0) {
          res.json({ summaries: [] });
          return;
        }

        const ideas = await prisma.generatedIdea.findMany({
          where: { id: { in: ideaIds } },
          include: { session: { include: { projectPolicy: { select: { userId: true } } } } },
        });
        const ownedIds = new Set(
          ideas
            .filter((i) => i.session.projectPolicy.userId === userId)
            .map((i) => i.id),
        );

        const stages = await prisma.workspaceStage.findMany({
          where: { ideaId: { in: Array.from(ownedIds) } },
          orderBy: { stageNumber: "asc" },
          include: { tasks: { orderBy: { orderIndex: "asc" } } },
        });

        const summaries = Array.from(ownedIds).map((ideaId) => {
          const ideaStages = stages.filter((s) => s.ideaId === ideaId);
          const coreTasks = ideaStages.flatMap((s) =>
            s.tasks.filter((t) => t.orderIndex < 100),
          );
          const total = coreTasks.length;
          const done = coreTasks.filter(
            (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
          ).length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);

          let nextTaskContent: string | null = null;
          let nextStageName: string | null = null;
          let nextStageNumber: number | null = null;
          for (const stage of ideaStages) {
            const pending = stage.tasks
              .filter((t) => t.orderIndex < 100)
              .find((t) => t.status === "PENDING");
            if (pending) {
              nextTaskContent = pending.content;
              nextStageName = stage.name;
              nextStageNumber = stage.stageNumber;
              break;
            }
          }

          return {
            ideaId,
            total,
            done,
            pct,
            stageCount: ideaStages.length,
            nextTask: nextTaskContent,
            nextStageName,
            nextStageNumber,
          };
        });

        res.json({ summaries });
      } catch (err) {
        handleRouteError(res, err, "Workspace 요약 오류");
      }
    },
  );

  /* ─── GET /api/workspace/:ideaId ─────────────────────────
     워크스페이스 + 모든 stage·task 조회 (없으면 빈 응답) */
  app.get(
    "/api/workspace/:ideaId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }

        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          // 워크스페이스 멤버인지 확인
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId, userId } },
          });
          if (!member) {
            res.status(403).json({ error: "접근 권한이 없습니다." });
            return;
          }
        }

        let stages = await prisma.workspaceStage.findMany({
          where: { ideaId },
          orderBy: { stageNumber: "asc" },
          include: {
            tasks: {
              orderBy: { orderIndex: "asc" },
              include: { assignee: { select: { id: true, name: true, email: true, userCode: true } } },
            },
          },
        });

        // 워크스페이스가 빈 상태면 owner인 경우 자동 시드 (템플릿 v2 적용 시 + 마이그레이션 후)
        if (stages.length === 0 && isOwner) {
          await ensureWorkspaceForIdea(prisma, ideaId);
          stages = await prisma.workspaceStage.findMany({
            where: { ideaId },
            orderBy: { stageNumber: "asc" },
            include: {
              tasks: {
                orderBy: { orderIndex: "asc" },
                include: { assignee: { select: { id: true, name: true, email: true, userCode: true } } },
              },
            },
          });
        }

        res.json({
          idea: {
            id: idea.id,
            titleKo: idea.titleKo,
            oneLinerKo: idea.oneLinerKo,
            status: idea.status,
          },
          isOwner,
          stages,
        });
      } catch (err) {
        handleRouteError(res, err, "Workspace 조회 오류");
      }
    },
  );

  /* ─── POST /api/workspace/:ideaId/ensure ─────────────────
     수동으로 워크스페이스 생성 (대표 미선정 idea도 가능) */
  app.post(
    "/api/workspace/:ideaId/ensure",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea || idea.session.projectPolicy.userId !== userId) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }

        const result = await ensureWorkspaceForIdea(prisma, ideaId);
        res.json({ ok: true, ...result });
      } catch (err) {
        handleRouteError(res, err, "Workspace 생성 오류");
      }
    },
  );

  /* ─── POST /api/workspace/stages/:stageId/tasks ──────────
     사용자 정의 task 추가 */
  app.post(
    "/api/workspace/stages/:stageId/tasks",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const stageId = String(req.params.stageId);
        const content = String(req.body?.content ?? "").trim();
        const outsourceRole =
          typeof req.body?.outsourceRole === "string" ? req.body.outsourceRole : null;
        if (!content) {
          res.status(400).json({ error: "내용을 입력해주세요." });
          return;
        }

        const stage = await prisma.workspaceStage.findUnique({
          where: { id: stageId },
          include: {
            tasks: { orderBy: { orderIndex: "desc" }, take: 1 },
          },
        });
        if (!stage) {
          res.status(404).json({ error: "단계를 찾을 수 없습니다." });
          return;
        }
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea || idea.session.projectPolicy.userId !== userId) {
          res.status(404).json({ error: "권한이 없습니다." });
          return;
        }

        const nextOrder = (stage.tasks[0]?.orderIndex ?? -1) + 1;
        const task = await prisma.workspaceTask.create({
          data: {
            stageId,
            content,
            outsourceRole,
            isCustom: true,
            orderIndex: nextOrder,
          },
        });
        res.json({ task });
      } catch (err) {
        handleRouteError(res, err, "Task 추가 오류");
      }
    },
  );

  /* ─── GET /api/workspace/tasks/:taskId/applicants
     외주 task에 연결된 글의 댓글 작성자 + 그 글로부터 시작된 DM 발송자 통합 — 지원자 모음 */
  app.get(
    "/api/workspace/tasks/:taskId/applicants",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const taskId = String(req.params.taskId);
        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: { stage: true },
        });
        if (!task) {
          res.status(404).json({ error: "task가 없습니다." });
          return;
        }
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: task.stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea || idea.session.projectPolicy.userId !== userId) {
          res.status(404).json({ error: "권한이 없습니다." });
          return;
        }

        if (!task.communityPostId) {
          res.json({ commentCount: 0, dmCount: 0, applicants: [] });
          return;
        }

        // 1. 댓글 작성자 (본인 제외)
        const comments = await prisma.postComment.findMany({
          where: { postId: task.communityPostId, NOT: { authorId: userId } },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, email: true, userCode: true } } },
        });

        // 2. 본인이 receiver인 DM 대화 — 글 작성자(본인)에게 보낸 사람들
        // 글의 author에게 보낸 DM = receiverId === userId 또는 sender 다른 user인 모든 대화
        // 단순화: 본인 DM 대화 전체 가져와서, 첫 메시지 시점이 글 게시 후인 것 + 메시지 본문에 글 제목이 포함되는 것 (prefill 메시지 사용)
        // 글 정보 조회
        const post = await prisma.communityPost.findUnique({
          where: { id: task.communityPostId },
          select: { title: true, createdAt: true },
        });

        const allConvs = await prisma.directConversation.findMany({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
          include: {
            userA: { select: { id: true, name: true, email: true, userCode: true } },
            userB: { select: { id: true, name: true, email: true, userCode: true } },
            messages: {
              where: post ? { createdAt: { gte: post.createdAt } } : {},
              orderBy: { createdAt: "asc" },
              take: 3,
            },
          },
        });

        // 글 prefill 메시지 패턴: "[{post.title}] 글 보고 연락드립니다" 또는 글 제목 포함
        const dmCandidates = post
          ? allConvs.filter((c) => {
              const firstMsg = c.messages[0];
              if (!firstMsg) return false;
              if (firstMsg.senderId === userId) return false; // 내가 보낸 게 아님
              return firstMsg.content.includes(post.title);
            })
          : [];

        // 통합 — author.id 기준 dedupe
        const peerMap = new Map<string, {
          userId: string;
          name: string | null;
          email: string;
          userCode: string | null;
          channels: { commented: boolean; dmId: string | null; firstMessage: string | null };
        }>();

        for (const c of comments) {
          if (!peerMap.has(c.author.id)) {
            peerMap.set(c.author.id, {
              userId: c.author.id,
              name: c.author.name,
              email: c.author.email,
              userCode: c.author.userCode,
              channels: { commented: true, dmId: null, firstMessage: null },
            });
          } else {
            peerMap.get(c.author.id)!.channels.commented = true;
          }
        }

        for (const c of dmCandidates) {
          const peer = c.userA.id === userId ? c.userB : c.userA;
          const firstMsg = c.messages[0];
          const existing = peerMap.get(peer.id);
          if (existing) {
            existing.channels.dmId = c.id;
            existing.channels.firstMessage = firstMsg?.content ?? null;
          } else {
            peerMap.set(peer.id, {
              userId: peer.id,
              name: peer.name,
              email: peer.email,
              userCode: peer.userCode,
              channels: { commented: false, dmId: c.id, firstMessage: firstMsg?.content ?? null },
            });
          }
        }

        const applicants = Array.from(peerMap.values());
        res.json({
          commentCount: comments.length,
          dmCount: dmCandidates.length,
          applicants,
        });
      } catch (err) {
        handleRouteError(res, err, "지원자 조회 오류");
      }
    },
  );

  /* ─── PATCH /api/workspace/tasks/:taskId ─────────────────
     status·content 변경 (TOGGLE 완료/내일로/취소 등) */
  app.patch(
    "/api/workspace/tasks/:taskId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const taskId = String(req.params.taskId);
        const status = req.body?.status as
          | "PENDING"
          | "DONE"
          | "SKIPPED"
          | "OUTSOURCED"
          | undefined;
        const content =
          typeof req.body?.content === "string" ? req.body.content.trim() : undefined;

        const assigneeId = req.body?.assigneeId !== undefined
          ? (req.body.assigneeId === null ? null : String(req.body.assigneeId))
          : undefined;
        const dueDate = req.body?.dueDate !== undefined
          ? (req.body.dueDate === null ? null : new Date(req.body.dueDate))
          : undefined;
        const notes = req.body?.notes !== undefined
          ? (req.body.notes === null ? null : String(req.body.notes))
          : undefined;
        const outsourceRole = req.body?.outsourceRole !== undefined
          ? (req.body.outsourceRole === null || req.body.outsourceRole === "" ? null : String(req.body.outsourceRole))
          : undefined;

        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: { stage: { include: { tasks: false } } },
        });
        if (!task) {
          res.status(404).json({ error: "Task가 없습니다." });
          return;
        }
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: task.stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        // OWNER 또는 EDITOR 멤버만 수정 가능
        const isOwner = idea?.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId: task.stage.ideaId, userId } },
          });
          if (!member || member.role === "VIEWER") {
            res.status(403).json({ error: "권한이 없습니다." });
            return;
          }
        }

        const data: Prisma.WorkspaceTaskUpdateInput = {};
        if (status) {
          data.status = status;
          if (status === "DONE") data.completedAt = new Date();
          else if (status === "PENDING") data.completedAt = null;
        }
        if (typeof content === "string" && content.length > 0) data.content = content;
        if (assigneeId !== undefined) {
          data.assignee = assigneeId
            ? { connect: { id: assigneeId } }
            : { disconnect: true };
        }
        if (dueDate !== undefined) data.dueDate = dueDate;
        if (notes !== undefined) data.notes = notes;
        if (outsourceRole !== undefined) data.outsourceRole = outsourceRole;

        const updated = await prisma.workspaceTask.update({
          where: { id: taskId },
          data,
          include: { assignee: { select: { id: true, name: true, email: true, userCode: true } } },
        });

        // 단계의 모든 task가 DONE이면 stage status도 DONE
        const sibs = await prisma.workspaceTask.findMany({
          where: { stageId: task.stageId },
          select: { status: true },
        });
        const allDone =
          sibs.length > 0 &&
          sibs.every((t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED");
        const anyDone = sibs.some((t) => t.status === "DONE");
        await prisma.workspaceStage.update({
          where: { id: task.stageId },
          data: { status: allDone ? "DONE" : anyDone ? "ACTIVE" : "PENDING" },
        });

        res.json({ task: updated });
      } catch (err) {
        handleRouteError(res, err, "Task 변경 오류");
      }
    },
  );

  /* ─── DELETE /api/workspace/tasks/:taskId ───────────────── */
  app.delete(
    "/api/workspace/tasks/:taskId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const taskId = String(req.params.taskId);

        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: { stage: true },
        });
        if (!task) {
          res.status(404).json({ error: "Task가 없습니다." });
          return;
        }
        if (!task.isCustom) {
          res.status(400).json({ error: "기본 체크리스트는 삭제할 수 없습니다." });
          return;
        }
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: task.stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea || idea.session.projectPolicy.userId !== userId) {
          res.status(404).json({ error: "권한이 없습니다." });
          return;
        }

        await prisma.workspaceTask.delete({ where: { id: taskId } });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "Task 삭제 오류");
      }
    },
  );

  /* ─── POST /api/workspace/tasks/:taskId/outsource ────────
     외주 의뢰 — artifacts 톤으로 자동 작성 + 사용자 편집 후 게시.
     첫 번째 호출은 'preview'(생성된 글 초안 반환), 두 번째는 'publish'(실제 게시).

     body:
       { mode: "preview" }                                    → AI가 초안만 만듦
       { mode: "publish", title, content, category? }         → 게시
   */
  app.post(
    "/api/workspace/tasks/:taskId/outsource",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const taskId = String(req.params.taskId);
        const mode = (req.body?.mode as string) ?? "preview";

        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: { stage: true },
        });
        if (!task) {
          res.status(404).json({ error: "Task가 없습니다." });
          return;
        }
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: task.stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea || idea.session.projectPolicy.userId !== userId) {
          res.status(404).json({ error: "권한이 없습니다." });
          return;
        }

        if (mode === "preview") {
          // artifacts·idea 컨텍스트 기반 초안 생성
          const artifacts = (idea.artifactsKo ?? null) as
            | {
                recruitingPost?: { titleKo?: string; bodyKo?: string };
                coffeeChatTemplate?: { bodyKo?: string };
              }
            | null;

          const systemPrompt = `너는 한국 스타트업 외주·팀원 모집 글을 쓰는 전문가다.
- JSON으로만 응답. 마크다운·코드펜스 없음.
- 컨설턴트 톤(합리화·최적화·혁신·디지털화 등) 금지.
- 본문은 즉시 게시 가능한 완성된 텍스트.`;

          const userPrompt = `# 컨텍스트
- 아이디어: ${idea.titleKo}
- 한 줄: ${idea.oneLinerKo ?? ""}
- 단계: ${task.stage.stageNumber}. ${task.stage.name}
- 작업: ${task.content}
- 영입 역할: ${task.outsourceRole ?? "—"}

# 참고 (이미 사용자가 만든 모집 톤)
${artifacts?.recruitingPost?.bodyKo ? `## 모집글 톤\n${artifacts.recruitingPost.bodyKo.slice(0, 600)}` : ""}
${artifacts?.coffeeChatTemplate?.bodyKo ? `## 커피챗 톤\n${artifacts.coffeeChatTemplate.bodyKo.slice(0, 400)}` : ""}

# 작성할 글
- titleKo: 35자 이내. "[외주]" 또는 "[모집]" prefix + 작업명 + idea 한 마디
- bodyKo: 마크다운, 500~700자. 다음 포함
  * 시작: "[idea] 단계: [task.stage.name]에서 [task.content]를 함께할 분을 찾습니다"
  * 우리 사업 한 줄
  * 이 단계에서 무엇이 필요한지 (구체적)
  * 어떤 역량을 가진 사람을 찾는지 (3~5줄)
  * 보상/지분/일정 (개략)
  * 지원 방법

# JSON 형식
{
  "titleKo": "string",
  "bodyKo": "string",
  "category": "${
    task.outsourceRole?.includes("AC") || task.outsourceRole?.includes("멘토")
      ? "AC_REQUEST"
      : task.outsourceRole?.includes("베타")
        ? "BETA_TESTER"
        : task.outsourceRole?.includes("팀원") || task.outsourceRole?.includes("정직원")
          ? "TEAM_RECRUIT"
          : "OUTSOURCE_REQUEST"
  }"
}`;

          const raw = await geminiChat(systemPrompt, userPrompt, {
            temperature: 0.6,
            maxOutputTokens: 2048,
            jsonMode: true,
          });
          let draft: { titleKo?: string; bodyKo?: string; category?: string };
          try {
            draft = JSON.parse(
              raw
                .replace(/^```[a-z]*\n?/i, "")
                .replace(/```$/, "")
                .trim(),
            );
          } catch {
            res.status(502).json({ error: "초안 생성 실패. 다시 시도해주세요." });
            return;
          }
          res.json({ draft });
          return;
        }

        // mode === "publish"
        const title = String(req.body?.title ?? "").trim().slice(0, 200);
        const content = String(req.body?.content ?? "").trim();
        const category = (req.body?.category as string) ?? "OUTSOURCE_REQUEST";
        if (!title || !content) {
          res.status(400).json({ error: "제목과 본문이 필요합니다." });
          return;
        }

        const post = await prisma.communityPost.create({
          data: {
            title,
            content,
            category: category as Prisma.CommunityPostCreateInput["category"],
            authorId: userId,
            // 글에 아이디어 연결 → 신청자가 클릭하면 워크스페이스로 진입 + DM 자동 시작 가능
            ideaId: task.stage.ideaId,
          },
        });

        // task에 연결 + status OUTSOURCED
        await prisma.workspaceTask.update({
          where: { id: task.id },
          data: {
            status: "OUTSOURCED",
            communityPostId: post.id,
          },
        });

        res.json({ post });
      } catch (err) {
        handleRouteError(res, err, "외주 의뢰 오류");
      }
    },
  );

  /* ─── GET /api/workspace/tasks/:taskId/comments ────────────
     태스크 댓글 목록 */
  app.get(
    "/api/workspace/tasks/:taskId/comments",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const taskId = String(req.params.taskId);

        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: { stage: { include: { tasks: false } } },
        });
        if (!task) { res.status(404).json({ error: "Task 없음" }); return; }

        // 워크스페이스 접근 권한 확인
        const ideaId = task.stage.ideaId;
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const comments = await prisma.workspaceTaskComment.findMany({
          where: { taskId },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, email: true } } },
        });

        res.json({ comments });
      } catch (err) {
        handleRouteError(res, err, "댓글 조회 오류");
      }
    },
  );

  /* ─── POST /api/workspace/tasks/:taskId/comments ────────────
     태스크 댓글 작성 */
  app.post(
    "/api/workspace/tasks/:taskId/comments",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const taskId = String(req.params.taskId);
        const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
        if (!content) { res.status(400).json({ error: "내용을 입력해주세요." }); return; }

        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: { stage: true },
        });
        if (!task) { res.status(404).json({ error: "Task 없음" }); return; }

        const ideaId = task.stage.ideaId;
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const comment = await prisma.workspaceTaskComment.create({
          data: { taskId, authorId: userId, content },
          include: { author: { select: { id: true, name: true, email: true } } },
        });

        res.status(201).json({ comment });
      } catch (err) {
        handleRouteError(res, err, "댓글 작성 오류");
      }
    },
  );

  /* ─── DELETE /api/workspace/tasks/:taskId/comments/:commentId
     본인 댓글 삭제 */
  app.delete(
    "/api/workspace/tasks/:taskId/comments/:commentId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const commentId = String(req.params.commentId);

        const comment = await prisma.workspaceTaskComment.findUnique({
          where: { id: commentId },
        });
        if (!comment) { res.status(404).json({ error: "댓글 없음" }); return; }
        if (comment.authorId !== userId) { res.status(403).json({ error: "본인 댓글만 삭제 가능" }); return; }

        await prisma.workspaceTaskComment.delete({ where: { id: commentId } });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "댓글 삭제 오류");
      }
    },
  );

  /* ─── GET /api/workspace/:ideaId/messages ──────────────────
     워크스페이스 채팅 메시지 목록 (최신 100개) */
  app.get(
    "/api/workspace/:ideaId/messages",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);

        // 접근 권한 확인
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const messages = await prisma.workspaceMessage.findMany({
          where: { ideaId },
          orderBy: { createdAt: "asc" },
          take: 100,
          include: { author: { select: { id: true, name: true, email: true } } },
        });

        res.json({ messages });
      } catch (err) {
        handleRouteError(res, err, "메시지 조회 오류");
      }
    },
  );

  /* ─── POST /api/workspace/:ideaId/messages ─────────────────
     새 채팅 메시지 전송 */
  app.post(
    "/api/workspace/:ideaId/messages",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = String(req.params.ideaId);
        const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
        if (!content) { res.status(400).json({ error: "내용을 입력해주세요." }); return; }

        // 접근 권한 확인 (OWNER 또는 멤버)
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const message = await prisma.workspaceMessage.create({
          data: { ideaId, authorId: userId, content },
          include: { author: { select: { id: true, name: true, email: true } } },
        });

        emitToWorkspace(prisma, ideaId, "chat.message", { ideaId, message }).catch(() => {});

        res.status(201).json({ message });
      } catch (err) {
        handleRouteError(res, err, "메시지 전송 오류");
      }
    },
  );

  /* ─── GET /api/workspace/stages/:stageId/files ──────────
     단계 첨부 파일 목록 (data 제외) */
  app.get(
    "/api/workspace/stages/:stageId/files",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const stageId = String(req.params.stageId);

        const stage = await prisma.workspaceStage.findUnique({ where: { id: stageId } });
        if (!stage) { res.status(404).json({ error: "단계 없음" }); return; }

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId: stage.ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const files = await prisma.workspaceStageFile.findMany({
          where: { stageId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            note: true,
            createdAt: true,
            uploader: { select: { id: true, name: true, email: true } },
          },
        });
        res.json({ files });
      } catch (err) {
        handleRouteError(res, err, "파일 목록 오류");
      }
    },
  );

  /* ─── POST /api/workspace/stages/:stageId/files ──────────
     단계 첨부 파일 업로드 (multipart/form-data, field=file) */
  app.post(
    "/api/workspace/stages/:stageId/files",
    requireAuth,
    stageFileUpload.single("file"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const stageId = String(req.params.stageId);
        const file = (req as Request & { file?: Express.Multer.File }).file;
        const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

        if (!file) { res.status(400).json({ error: "파일을 업로드해주세요." }); return; }

        const stage = await prisma.workspaceStage.findUnique({ where: { id: stageId } });
        if (!stage) { res.status(404).json({ error: "단계 없음" }); return; }

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId: stage.ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const created = await prisma.workspaceStageFile.create({
          data: {
            stageId,
            uploaderId: userId,
            filename: file.originalname,
            mimeType: file.mimetype || "application/octet-stream",
            sizeBytes: file.size,
            dataB64: file.buffer.toString("base64"),
            note: note || null,
          },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            note: true,
            createdAt: true,
            uploader: { select: { id: true, name: true, email: true } },
          },
        });
        res.status(201).json({ file: created });
      } catch (err) {
        handleRouteError(res, err, "파일 업로드 오류");
      }
    },
  );

  /* ─── GET /api/workspace/files/:fileId/download ──────────
     첨부 파일 바이너리 다운로드 */
  app.get(
    "/api/workspace/files/:fileId/download",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const fileId = String(req.params.fileId);

        const file = await prisma.workspaceStageFile.findUnique({
          where: { id: fileId },
          include: { stage: true },
        });
        if (!file) { res.status(404).json({ error: "파일 없음" }); return; }

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: file.stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        if (!isOwner) {
          const member = await prisma.ideaWorkspaceMember.findUnique({
            where: { ideaId_userId: { ideaId: file.stage.ideaId, userId } },
          });
          if (!member) { res.status(403).json({ error: "접근 권한 없음" }); return; }
        }

        const buf = Buffer.from(file.dataB64, "base64");
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        );
        res.setHeader("Content-Length", buf.length.toString());
        res.end(buf);
      } catch (err) {
        handleRouteError(res, err, "파일 다운로드 오류");
      }
    },
  );

  /* ─── DELETE /api/workspace/files/:fileId ──────────
     본인 업로드 또는 워크스페이스 owner만 삭제 가능 */
  app.delete(
    "/api/workspace/files/:fileId",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const fileId = String(req.params.fileId);

        const file = await prisma.workspaceStageFile.findUnique({
          where: { id: fileId },
          include: { stage: true },
        });
        if (!file) { res.status(404).json({ error: "파일 없음" }); return; }

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: file.stage.ideaId },
          include: { session: { include: { projectPolicy: true } } },
        });
        if (!idea) { res.status(404).json({ error: "아이디어 없음" }); return; }
        const isOwner = idea.session.projectPolicy.userId === userId;
        const isUploader = file.uploaderId === userId;
        if (!isOwner && !isUploader) {
          res.status(403).json({ error: "본인 업로드 또는 owner만 삭제 가능합니다." });
          return;
        }

        await prisma.workspaceStageFile.delete({ where: { id: fileId } });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "파일 삭제 오류");
      }
    },
  );
}
