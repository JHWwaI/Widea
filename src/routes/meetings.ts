import { type Express, type Request, type Response } from "express";
import { type PrismaClient, Prisma } from "@prisma/client";
import multer from "multer";
import Groq, { toFile } from "groq-sdk";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { geminiChat } from "../lib/geminiChat.js";

/** 25MB 제한 — Groq Whisper Large v3 파일 크기 한도 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

/**
 * AI 요약 생성 — transcript 텍스트로부터 회의록 요약 작성
 */
async function summarizeTranscript(transcript: string, ideaTitle?: string): Promise<{
  keyPoints: string[];
  decisions: string[];
  actions: Array<{ owner?: string; content: string }>;
  nextSteps: string[];
} | null> {
  if (!transcript || transcript.length < 30) return null;

  // 너무 길면 자르기 (Groq Whisper transcript는 길수도 — 8K 까지만)
  const safe = transcript.length > 24000 ? transcript.slice(0, 24000) : transcript;

  const sys = `너는 한국 스타트업의 회의록 정리 전문가다. 주어진 회의 transcript에서 다음을 추출하라:
1. keyPoints — 핵심 요약 (3~5 bullet, 한 줄씩)
2. decisions — 결정 사항 (있는 경우만)
3. actions — 액션 아이템 (담당자가 명시되면 owner도, 없으면 owner 비움)
4. nextSteps — 다음 단계

JSON 형식만 응답:
{
  "keyPoints": ["..."],
  "decisions": ["..."],
  "actions": [{"owner":"이름","content":"할일"}],
  "nextSteps": ["..."]
}

규칙:
- 환각 금지. transcript에 없는 내용 만들지 말 것.
- 컨설턴트 톤(합리화·최적화·혁신·디지털화) 금지.
- 한국어로 작성.
- 빈 배열도 OK.`;

  const userPrompt = `# 회의 컨텍스트
${ideaTitle ? `프로젝트: ${ideaTitle}` : ""}

# Transcript
${safe}`;

  try {
    const raw = await geminiChat(sys, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 4096,
      jsonMode: true,
    });
    const cleaned = raw
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[meetings] AI 요약 실패:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function registerMeetingRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient },
): void {
  /* ─── A. 녹음 파일 업로드 → Whisper 전사 → AI 요약 ─── */
  app.post(
    "/api/meetings/transcribe",
    requireAuth,
    upload.single("audio"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        if (!groq) {
          res.status(503).json({ error: "Groq API 키가 설정되지 않았습니다." });
          return;
        }
        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) {
          res.status(400).json({ error: "오디오 파일을 업로드해주세요." });
          return;
        }
        const ideaId = (req.body.ideaId as string) || null;
        const roomCode = (req.body.roomCode as string) || null;
        const title = (req.body.title as string) || "회의록";

        // ideaId 권한 체크
        if (ideaId) {
          const idea = await prisma.generatedIdea.findUnique({
            where: { id: ideaId },
            include: { session: { include: { projectPolicy: true } } },
          });
          if (!idea || idea.session.projectPolicy.userId !== userId) {
            res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
            return;
          }
        }

        console.log(
          `[meetings] 업로드 받음 ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        );

        // Groq Whisper 전사
        const transcription = await groq.audio.transcriptions.create({
          file: await toFile(file.buffer, file.originalname),
          model: "whisper-large-v3-turbo",
          language: "ko",
          response_format: "verbose_json",
        });

        const transcriptText = transcription.text ?? "";
        const durationSec =
          typeof (transcription as unknown as { duration?: number }).duration === "number"
            ? Math.round((transcription as unknown as { duration: number }).duration)
            : null;

        console.log(`[meetings] 전사 완료 (${transcriptText.length}자, ${durationSec ?? "?"}초)`);

        // AI 요약
        const idea = ideaId
          ? await prisma.generatedIdea.findUnique({
              where: { id: ideaId },
              select: { titleKo: true },
            })
          : null;
        const summary = await summarizeTranscript(transcriptText, idea?.titleKo);

        // DB 저장
        const note = await prisma.meetingNote.create({
          data: {
            userId,
            ideaId,
            roomCode,
            title,
            source: "UPLOAD",
            durationSec,
            transcriptText,
            summary: summary
              ? (summary as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });

        res.json({ note });
      } catch (err) {
        handleRouteError(res, err, "회의록 전사 오류");
      }
    },
  );

  /* ─── B. 실시간 자막 (브라우저 transcript) 저장 + AI 요약 ─── */
  app.post(
    "/api/meetings/save-live",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const transcriptText = String(req.body?.transcriptText ?? "").trim();
        const title = String(req.body?.title ?? "회의록 (실시간)");
        const ideaId = (req.body?.ideaId as string) || null;
        const roomCode = (req.body?.roomCode as string) || null;
        const durationSec = typeof req.body?.durationSec === "number"
          ? Math.round(req.body.durationSec)
          : null;

        if (!transcriptText || transcriptText.length < 10) {
          res.status(400).json({ error: "transcript가 너무 짧습니다." });
          return;
        }

        if (ideaId) {
          const idea = await prisma.generatedIdea.findUnique({
            where: { id: ideaId },
            include: { session: { include: { projectPolicy: true } } },
          });
          if (!idea || idea.session.projectPolicy.userId !== userId) {
            res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
            return;
          }
        }

        const idea = ideaId
          ? await prisma.generatedIdea.findUnique({
              where: { id: ideaId },
              select: { titleKo: true },
            })
          : null;
        const summary = await summarizeTranscript(transcriptText, idea?.titleKo);

        const note = await prisma.meetingNote.create({
          data: {
            userId,
            ideaId,
            roomCode,
            title,
            source: "LIVE_BROWSER",
            durationSec,
            transcriptText,
            summary: summary
              ? (summary as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });

        res.json({ note });
      } catch (err) {
        handleRouteError(res, err, "실시간 회의록 저장 오류");
      }
    },
  );

  /* ─── 목록 + 상세 + 삭제 ─── */
  app.get(
    "/api/meetings",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = (req.query.ideaId as string) || undefined;
        const notes = await prisma.meetingNote.findMany({
          where: { userId, ...(ideaId ? { ideaId } : {}) },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            title: true,
            source: true,
            durationSec: true,
            ideaId: true,
            roomCode: true,
            summary: true,
            createdAt: true,
          },
        });
        res.json({ notes });
      } catch (err) {
        handleRouteError(res, err, "회의록 목록 오류");
      }
    },
  );

  app.get(
    "/api/meetings/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const note = await prisma.meetingNote.findUnique({ where: { id } });
        if (!note || note.userId !== userId) {
          res.status(404).json({ error: "회의록을 찾을 수 없습니다." });
          return;
        }
        res.json({ note });
      } catch (err) {
        handleRouteError(res, err, "회의록 상세 오류");
      }
    },
  );

  app.delete(
    "/api/meetings/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const note = await prisma.meetingNote.findUnique({ where: { id } });
        if (!note || note.userId !== userId) {
          res.status(404).json({ error: "회의록을 찾을 수 없습니다." });
          return;
        }
        await prisma.meetingNote.delete({ where: { id } });
        res.json({ ok: true });
      } catch (err) {
        handleRouteError(res, err, "회의록 삭제 오류");
      }
    },
  );

  /* ─── 회의록 → 워크스페이스 task로 변환 ─── */
  app.post(
    "/api/meetings/:id/to-tasks",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);
        const stageId = String(req.body?.stageId ?? "");
        if (!stageId) {
          res.status(400).json({ error: "stageId가 필요합니다." });
          return;
        }

        const note = await prisma.meetingNote.findUnique({ where: { id } });
        if (!note || note.userId !== userId) {
          res.status(404).json({ error: "회의록을 찾을 수 없습니다." });
          return;
        }

        const stage = await prisma.workspaceStage.findUnique({
          where: { id: stageId },
          include: { tasks: { orderBy: { orderIndex: "desc" }, take: 1 } },
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

        const summary = note.summary as null | {
          actions?: Array<{ owner?: string; content?: string }>;
        };
        const actions = Array.isArray(summary?.actions) ? summary.actions : [];
        if (actions.length === 0) {
          res.status(400).json({ error: "액션 아이템이 없습니다." });
          return;
        }

        let order = (stage.tasks[0]?.orderIndex ?? -1) + 1;
        const created = [];
        for (const a of actions) {
          if (!a?.content) continue;
          const t = await prisma.workspaceTask.create({
            data: {
              stageId,
              content: a.owner ? `[${a.owner}] ${a.content}` : a.content,
              isCustom: true,
              orderIndex: order++,
            },
          });
          created.push(t);
        }
        res.json({ created: created.length });
      } catch (err) {
        handleRouteError(res, err, "task 변환 오류");
      }
    },
  );
}
