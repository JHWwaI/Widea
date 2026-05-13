import { type Express, type Request, type Response } from "express";
import { type PrismaClient, Prisma } from "@prisma/client";
import multer from "multer";
import Groq, { toFile } from "groq-sdk";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import AdmZip from "adm-zip";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { geminiChat } from "../lib/geminiChat.js";
import {
  MEETING_TEMPLATES,
  isMeetingTemplateKey,
  type MeetingTemplateKey,
} from "../lib/meetingTemplates.js";
import {
  buildMeetingDocx,
  asciiFilename,
  type MeetingDocxDesign,
} from "../lib/meetingDocx.js";

function parseDesign(v: unknown): MeetingDocxDesign {
  return v === "minimal" || v === "business" ? v : "classic";
}

/** 25MB — Whisper 한도. 문서는 실제로 훨씬 작지만 같은 multer 인스턴스 재사용 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/** 문서 파일에서 텍스트 추출 */
async function extractDocumentText(
  buffer: Buffer,
  mimetype: string,
  filename: string,
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  // PDF
  if (mimetype === "application/pdf" || ext === "pdf") {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  // DOCX (Word 2007+)
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // HWPX (한글 2010+ — ZIP + XML 구조)
  if (
    mimetype === "application/vnd.hancom.hwpx" ||
    ext === "hwpx"
  ) {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      const parts: string[] = [];
      for (const entry of entries) {
        // 본문 텍스트가 담긴 section XML
        if (/Contents\/section\d+\.xml$/i.test(entry.entryName)) {
          const xml = entry.getData().toString("utf8");
          // <hp:t> 태그 안의 텍스트 추출
          const matches = xml.match(/<hp:t[^>]*>([^<]+)<\/hp:t>/g) ?? [];
          const text = matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
          if (text.trim()) parts.push(text.trim());
        }
      }
      return parts.join("\n").trim();
    } catch {
      throw new Error("HWPX 파일을 읽을 수 없습니다.");
    }
  }

  // HWP (레거시 바이너리) — 완전 파싱 미지원, 사용자 안내
  if (ext === "hwp") {
    throw new Error(
      "한글(.hwp) 레거시 형식은 지원하지 않습니다.\n한글 앱에서 [다른 이름으로 저장 → .hwpx] 또는 [내보내기 → .docx]로 변환 후 다시 올려주세요.",
    );
  }

  throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
}

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

/**
 * AI 요약 생성 — transcript 텍스트로부터 회의록 요약 작성.
 * templateKey에 따라 출력 JSON 스키마가 달라짐.
 */
async function summarizeTranscript(
  transcript: string,
  ideaTitle?: string,
  templateKey: MeetingTemplateKey = "DEFAULT",
): Promise<Record<string, unknown> | null> {
  if (!transcript || transcript.length < 30) return null;

  const safe = transcript.length > 24000 ? transcript.slice(0, 24000) : transcript;
  const tpl = MEETING_TEMPLATES[templateKey] ?? MEETING_TEMPLATES.DEFAULT;

  const sys = `너는 한국 스타트업의 회의록 정리 전문가다. 회의 transcript를 "${tpl.label}" 템플릿에 맞춰 정리한다.

${tpl.prompt}

공통 규칙:
- 환각 금지. transcript에 없는 내용은 만들지 말 것.
- 컨설턴트 톤(합리화·최적화·혁신·디지털화) 금지. 일상 한국어로.
- 빈 배열 허용.
- JSON만 응답. 다른 설명·주석·마크다운 금지.`;

  const userPrompt = `# 회의 컨텍스트
${ideaTitle ? `프로젝트: ${ideaTitle}` : ""}
템플릿: ${tpl.label}

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
    console.error(
      `[meetings] AI 요약 실패 (template=${templateKey}):`,
      err instanceof Error ? err.message : err,
    );
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
        const templateKey: MeetingTemplateKey = isMeetingTemplateKey(req.body.templateKey)
          ? req.body.templateKey
          : "DEFAULT";

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
        const summary = await summarizeTranscript(transcriptText, idea?.titleKo, templateKey);

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
            templateKey,
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
        const templateKey: MeetingTemplateKey = isMeetingTemplateKey(req.body?.templateKey)
          ? req.body.templateKey
          : "DEFAULT";

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
        const summary = await summarizeTranscript(transcriptText, idea?.titleKo, templateKey);

        const note = await prisma.meetingNote.create({
          data: {
            userId,
            ideaId,
            roomCode,
            title,
            source: "LIVE_BROWSER",
            durationSec,
            transcriptText,
            templateKey,
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

  /* ─── C-1. 직접 작성 (AI 호출 없이 사용자가 템플릿 양식대로 입력한 회의록 저장) ─── */
  app.post(
    "/api/meetings/save-manual",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const title = String(req.body?.title ?? "회의록").trim() || "회의록";
        const ideaId = (req.body?.ideaId as string) || null;
        const roomCode = (req.body?.roomCode as string) || null;
        const templateKey: MeetingTemplateKey = isMeetingTemplateKey(req.body?.templateKey)
          ? req.body.templateKey
          : "DEFAULT";
        const summary = req.body?.summary;
        const transcriptText = String(req.body?.transcriptText ?? "").trim();

        if (!summary || typeof summary !== "object") {
          res.status(400).json({ error: "summary 누락" });
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

        const note = await prisma.meetingNote.create({
          data: {
            userId,
            ideaId,
            roomCode,
            title,
            source: "LIVE_BROWSER",
            durationSec: null,
            transcriptText: transcriptText || "(직접 작성된 회의록)",
            templateKey,
            summary: summary as unknown as Prisma.InputJsonValue,
          },
        });

        res.json({ note });
      } catch (err) {
        handleRouteError(res, err, "회의록 저장 오류");
      }
    },
  );

  /* ─── C-2. 문서 파일 업로드 (PDF · DOCX · HWPX) ─── */
  app.post(
    "/api/meetings/parse-doc",
    requireAuth,
    upload.single("document"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) {
          res.status(400).json({ error: "파일을 업로드해주세요." });
          return;
        }
        const ideaId = (req.body.ideaId as string) || null;
        const roomCode = (req.body.roomCode as string) || null;
        const title = (req.body.title as string) || file.originalname.replace(/\.[^.]+$/, "");
        const templateKey: MeetingTemplateKey = isMeetingTemplateKey(req.body.templateKey)
          ? req.body.templateKey
          : "DEFAULT";

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

        console.log(`[meetings] 문서 업로드: ${file.originalname} (${(file.size / 1024).toFixed(0)}KB)`);

        const transcriptText = await extractDocumentText(file.buffer, file.mimetype, file.originalname);
        if (!transcriptText || transcriptText.length < 30) {
          res.status(400).json({ error: "문서에서 텍스트를 추출하지 못했습니다. 텍스트가 포함된 문서인지 확인해주세요." });
          return;
        }

        console.log(`[meetings] 문서 텍스트 추출 완료 (${transcriptText.length}자)`);

        const idea = ideaId
          ? await prisma.generatedIdea.findUnique({ where: { id: ideaId }, select: { titleKo: true } })
          : null;
        const summary = await summarizeTranscript(transcriptText, idea?.titleKo, templateKey);

        const note = await prisma.meetingNote.create({
          data: {
            userId,
            ideaId,
            roomCode,
            title,
            source: "UPLOAD",
            durationSec: null,
            transcriptText,
            templateKey,
            summary: summary ? (summary as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        });

        res.json({ note });
      } catch (err) {
        handleRouteError(res, err, "문서 파싱 오류");
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
            templateKey: true,
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

  /* ─── 빈 회의록 양식 .docx 다운로드 ─── */
  app.get(
    "/api/meetings/template/:templateKey/blank.docx",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const raw = String(req.params.templateKey);
        const templateKey: MeetingTemplateKey = isMeetingTemplateKey(raw) ? raw : "DEFAULT";
        const design = parseDesign(req.query.design);
        const tpl = MEETING_TEMPLATES[templateKey];
        const buf = await buildMeetingDocx({
          templateKey,
          design,
          title: `${tpl.label} 회의록`,
          summary: null,
        });
        const filename = `${tpl.label}_회의록_양식_${design}.docx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        );
        res.setHeader("Content-Length", buf.length.toString());
        res.end(buf);
      } catch (err) {
        handleRouteError(res, err, "양식 생성 오류");
      }
    },
  );

  /* ─── 자동 채워진 회의록 .docx 다운로드 ─── */
  app.get(
    "/api/meetings/:id/docx",
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
        const templateKey: MeetingTemplateKey = isMeetingTemplateKey(note.templateKey)
          ? note.templateKey
          : "DEFAULT";
        const design = parseDesign(req.query.design);
        const summary =
          note.summary && typeof note.summary === "object"
            ? (note.summary as Record<string, unknown>)
            : null;
        const buf = await buildMeetingDocx({
          templateKey,
          design,
          title: note.title,
          summary,
          dateText: new Date(note.createdAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        });
        const filename = `${note.title}.docx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        );
        res.setHeader("Content-Length", buf.length.toString());
        res.end(buf);
      } catch (err) {
        handleRouteError(res, err, "회의록 docx 생성 오류");
      }
    },
  );
}
