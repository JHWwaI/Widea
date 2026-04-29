import { type Express, type Request, type Response } from "express";
import { type PrismaClient, type Prisma } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { ensureWorkspaceForIdea } from "../lib/workspace.js";
import { geminiChat } from "../lib/geminiChat.js";

export function registerWorkspaceRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
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
        if (!idea || idea.session.projectPolicy.userId !== userId) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }

        const stages = await prisma.workspaceStage.findMany({
          where: { ideaId },
          orderBy: { stageNumber: "asc" },
          include: {
            tasks: { orderBy: { orderIndex: "asc" } },
          },
        });

        res.json({
          idea: {
            id: idea.id,
            titleKo: idea.titleKo,
            oneLinerKo: idea.oneLinerKo,
            status: idea.status,
          },
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

        const task = await prisma.workspaceTask.findUnique({
          where: { id: taskId },
          include: {
            stage: {
              include: {
                tasks: false,
              },
            },
          },
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

        const data: Prisma.WorkspaceTaskUpdateInput = {};
        if (status) {
          data.status = status;
          if (status === "DONE") data.completedAt = new Date();
          else if (status === "PENDING") data.completedAt = null;
        }
        if (typeof content === "string" && content.length > 0) data.content = content;

        const updated = await prisma.workspaceTask.update({
          where: { id: taskId },
          data,
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
}
