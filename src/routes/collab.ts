/**
 * 협업 라우트 — 팀원 관리, 회의실, 웹훅 설정
 *
 * POST   /api/projects/:projectId/team                팀원 초대
 * GET    /api/projects/:projectId/team                팀원 목록
 * PATCH  /api/projects/:projectId/team/:memberId      역할/상태 변경
 * DELETE /api/projects/:projectId/team/:memberId      팀원 제거
 * POST   /api/team/accept/:token                      초대 수락 (토큰 기반)
 *
 * POST   /api/projects/:projectId/meetings            회의 생성
 * GET    /api/projects/:projectId/meetings            회의 목록
 * DELETE /api/projects/:projectId/meetings/:meetingId 회의 삭제
 *
 * PATCH  /api/projects/:projectId/webhooks            Slack/Discord URL 설정
 * GET    /api/projects/:projectId/webhooks            현재 웹훅 URL 조회
 */

import { randomUUID } from "node:crypto";
import { type Express, type Request, type Response } from "express";
import { type PrismaClient, TeamMemberRole, TeamMemberStatus } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError, notFoundError, forbiddenError } from "../lib/http.js";
import { fireWebhooks } from "../lib/webhooks.js";
import { sanitizeText } from "../lib/validation.js";
import { sendTeamInviteEmail } from "../lib/email.js";

type RegisterCollabRoutesOptions = { prisma: PrismaClient };

const VALID_ROLES = Object.values(TeamMemberRole);
const JITSI_SERVER = process.env.JITSI_SERVER || "https://meet.jit.si";

async function getOwnedProject(prisma: PrismaClient, projectId: string, userId: string) {
  const project = await prisma.projectPolicy.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, userId: true, slackWebhookUrl: true, discordWebhookUrl: true },
  });
  if (!project) throw notFoundError("프로젝트를 찾을 수 없습니다.");
  if (project.userId !== userId) throw forbiddenError("프로젝트 소유자만 접근할 수 있습니다.");
  return project;
}

async function getAccessibleProject(prisma: PrismaClient, projectId: string, userId: string) {
  const project = await prisma.projectPolicy.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, userId: true, slackWebhookUrl: true, discordWebhookUrl: true },
  });
  if (!project) throw notFoundError("프로젝트를 찾을 수 없습니다.");
  const isMember = await prisma.projectTeamMember.findFirst({
    where: { projectId, userId, status: TeamMemberStatus.ACTIVE },
  });
  if (project.userId !== userId && !isMember) throw forbiddenError("접근 권한이 없습니다.");
  return project;
}

export function registerCollabRoutes(app: Express, { prisma }: RegisterCollabRoutesOptions): void {

  /* ─────────────────────── TEAM ─────────────────────── */

  app.post("/api/projects/:projectId/team", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      const project = await getOwnedProject(prisma, projectId, userId);

      const email = sanitizeText(req.body.email)?.toLowerCase();
      const roleInput: TeamMemberRole = VALID_ROLES.includes(req.body.role) ? req.body.role : TeamMemberRole.MEMBER;
      const bio = req.body.bio ? sanitizeText(req.body.bio) : null;

      if (!email) { res.status(400).json({ error: "email은 필수입니다." }); return; }

      const existing = await prisma.projectTeamMember.findUnique({
        where: { projectId_email: { projectId, email } },
      });
      if (existing) { res.status(409).json({ error: "이미 초대되거나 팀에 포함된 이메일입니다." }); return; }

      const targetUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

      const member = await prisma.projectTeamMember.create({
        data: {
          email,
          userId: targetUser?.id ?? null,
          projectId,
          role: roleInput,
          bio,
          inviteToken: randomUUID(),
          status: TeamMemberStatus.INVITED,
        },
      });

      await fireWebhooks(
        { slack: project.slackWebhookUrl, discord: project.discordWebhookUrl },
        { type: "team_member_invited", projectTitle: project.title, email, role: roleInput },
      );

      const { email: inviterEmail } = getAuthedUser(req);
      sendTeamInviteEmail({
        toEmail: email,
        projectTitle: project.title,
        inviterEmail,
        role: roleInput,
        inviteToken: member.inviteToken!,
        appBaseUrl: process.env.APP_BASE_URL || "https://widea.kr",
      }).catch(() => {});

      res.status(201).json(member);
    } catch (err) { handleRouteError(res, err, "팀원 초대 오류"); }
  });

  app.get("/api/projects/:projectId/team", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      await getAccessibleProject(prisma, projectId, userId);

      const members = await prisma.projectTeamMember.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.json({ members });
    } catch (err) { handleRouteError(res, err, "팀원 목록 조회 오류"); }
  });

  app.patch("/api/projects/:projectId/team/:memberId", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      const memberId = String(req.params.memberId);
      await getOwnedProject(prisma, projectId, userId);

      const updateData: Record<string, unknown> = {};
      if (req.body.role && VALID_ROLES.includes(req.body.role)) updateData.role = req.body.role;
      if (req.body.status && Object.values(TeamMemberStatus).includes(req.body.status)) updateData.status = req.body.status;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio ? sanitizeText(req.body.bio) : null;

      const updated = await prisma.projectTeamMember.update({ where: { id: memberId }, data: updateData });
      res.json(updated);
    } catch (err) { handleRouteError(res, err, "팀원 수정 오류"); }
  });

  app.delete("/api/projects/:projectId/team/:memberId", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      const memberId = String(req.params.memberId);
      await getOwnedProject(prisma, projectId, userId);
      await prisma.projectTeamMember.delete({ where: { id: memberId } });
      res.json({ deleted: true });
    } catch (err) { handleRouteError(res, err, "팀원 제거 오류"); }
  });

  app.post("/api/team/accept/:token", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, email } = getAuthedUser(req);
      const token = String(req.params.token);

      const member = await prisma.projectTeamMember.findUnique({
        where: { inviteToken: token },
        include: {
          project: {
            select: { id: true, title: true, slackWebhookUrl: true, discordWebhookUrl: true },
          },
        },
      });

      if (!member) { res.status(404).json({ error: "유효하지 않은 초대 링크입니다." }); return; }
      if (member.email !== email) { res.status(403).json({ error: "초대받은 이메일과 로그인 이메일이 다릅니다." }); return; }
      if (member.status === TeamMemberStatus.ACTIVE) { res.json({ message: "이미 팀에 합류했습니다.", member }); return; }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

      const updated = await prisma.projectTeamMember.update({
        where: { id: member.id },
        data: { status: TeamMemberStatus.ACTIVE, userId, inviteToken: null },
      });

      await fireWebhooks(
        { slack: member.project.slackWebhookUrl, discord: member.project.discordWebhookUrl },
        { type: "team_member_joined", projectTitle: member.project.title, name: user?.name || email, role: member.role },
      );

      res.json({ message: "팀에 합류했습니다.", member: updated, projectId: member.projectId });
    } catch (err) { handleRouteError(res, err, "초대 수락 오류"); }
  });

  /* ─────────────────────── MEETINGS ─────────────────────── */

  app.post("/api/projects/:projectId/meetings", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      const project = await getAccessibleProject(prisma, projectId, userId);

      const title = sanitizeText(req.body.title);
      if (!title) { res.status(400).json({ error: "title은 필수입니다." }); return; }

      const agenda = req.body.agenda ? sanitizeText(req.body.agenda) : null;
      const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
      const roomId = randomUUID();

      const meeting = await prisma.projectMeeting.create({
        data: { title, roomId, agenda, scheduledAt, projectId, createdById: userId },
      });

      const roomUrl = `${JITSI_SERVER}/${roomId}`;

      await fireWebhooks(
        { slack: project.slackWebhookUrl, discord: project.discordWebhookUrl },
        { type: "meeting_created", projectTitle: project.title, meetingTitle: title, roomUrl, scheduledAt: scheduledAt?.toISOString() },
      );

      res.status(201).json({ ...meeting, roomUrl });
    } catch (err) { handleRouteError(res, err, "회의 생성 오류"); }
  });

  app.get("/api/projects/:projectId/meetings", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      await getAccessibleProject(prisma, projectId, userId);

      const meetings = await prisma.projectMeeting.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      });

      res.json({ meetings: meetings.map((m) => ({ ...m, roomUrl: `${JITSI_SERVER}/${m.roomId}` })) });
    } catch (err) { handleRouteError(res, err, "회의 목록 조회 오류"); }
  });

  app.delete("/api/projects/:projectId/meetings/:meetingId", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      const meetingId = String(req.params.meetingId);
      await getOwnedProject(prisma, projectId, userId);
      await prisma.projectMeeting.delete({ where: { id: meetingId } });
      res.json({ deleted: true });
    } catch (err) { handleRouteError(res, err, "회의 삭제 오류"); }
  });

  /* ─────────────────────── WEBHOOKS ─────────────────────── */

  app.get("/api/projects/:projectId/webhooks", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const project = await getOwnedProject(prisma, String(req.params.projectId), userId);
      res.json({ slackWebhookUrl: project.slackWebhookUrl, discordWebhookUrl: project.discordWebhookUrl });
    } catch (err) { handleRouteError(res, err, "웹훅 조회 오류"); }
  });

  app.patch("/api/projects/:projectId/webhooks", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const projectId = String(req.params.projectId);
      await getOwnedProject(prisma, projectId, userId);

      const updateData: Record<string, unknown> = {};
      if (req.body.slackWebhookUrl !== undefined) updateData.slackWebhookUrl = req.body.slackWebhookUrl?.trim() || null;
      if (req.body.discordWebhookUrl !== undefined) updateData.discordWebhookUrl = req.body.discordWebhookUrl?.trim() || null;

      const updated = await prisma.projectPolicy.update({
        where: { id: projectId },
        data: updateData,
        select: { slackWebhookUrl: true, discordWebhookUrl: true },
      });
      res.json(updated);
    } catch (err) { handleRouteError(res, err, "웹훅 설정 오류"); }
  });
}
