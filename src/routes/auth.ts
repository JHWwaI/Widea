import { randomBytes } from "node:crypto";
import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
} from "../lib/auth.js";
import { getVisibleCreditBalance, isAdminEmail } from "../lib/admin.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { sendContactEmail, sendContactConfirmEmail, sendPasswordResetEmail } from "../lib/email.js";

type RegisterAuthRoutesOptions = {
  prisma: PrismaClient;
};

function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  userType?: string | null;
  planType: string;
  creditBalance: number;
  userCode?: string | null;
  createdAt?: Date;
}) {
  const isAdmin = isAdminEmail(user.email);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    userType: user.userType ?? null,
    planType: user.planType,
    creditBalance: getVisibleCreditBalance(user),
    userCode: user.userCode ?? null,
    isAdmin,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}

/** 6자 대문자+숫자 고유 코드 생성 (충돌 시 재시도) */
async function generateUniqueUserCode(prisma: import("@prisma/client").PrismaClient): Promise<string> {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외 (0,O,1,I)
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    const buf = randomBytes(6);
    for (let i = 0; i < 6; i++) code += CHARS[buf[i] % CHARS.length];
    const existing = await prisma.user.findFirst({ where: { userCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("userCode 생성 실패 — 재시도 초과");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function registerAuthRoutes(
  app: Express,
  { prisma }: RegisterAuthRoutesOptions,
): void {
  app.post("/api/auth/register", async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
        res.status(400).json({ errorCode: "INVALID_EMAIL", error: "올바른 이메일 형식이 아닙니다." });
        return;
      }
      if (!password || typeof password !== "string" || password.length < PASSWORD_MIN) {
        res.status(400).json({ errorCode: "WEAK_PASSWORD", error: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` });
        return;
      }
      if (!PASSWORD_RE.test(password)) {
        res.status(400).json({ errorCode: "WEAK_PASSWORD", error: "비밀번호에 영문과 숫자가 각각 1자 이상 포함되어야 합니다." });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ errorCode: "EMAIL_TAKEN", error: "이미 가입된 이메일입니다." });
        return;
      }

      const hashed = await hashPassword(password);
      const userCode = await generateUniqueUserCode(prisma);
      const user = await prisma.user.create({
        data: { email, password: hashed, name: name || null, userCode },
      });

      const token = signToken({ userId: user.id, email: user.email });

      console.log(`\n✅ 회원가입: ${email}`);

      res.status(201).json({
        token,
        user: serializeUser(user),
      });
    } catch (err) {
      handleRouteError(res, err, "회원가입 오류");
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
        res.status(400).json({ errorCode: "INVALID_EMAIL", error: "올바른 이메일 형식이 아닙니다." });
        return;
      }
      if (!password || typeof password !== "string") {
        res.status(400).json({ errorCode: "MISSING_PASSWORD", error: "비밀번호를 입력해주세요." });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) {
        res.status(401).json({ errorCode: "INVALID_CREDENTIALS", error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        return;
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        res.status(401).json({ errorCode: "INVALID_CREDENTIALS", error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        return;
      }

      const token = signToken({ userId: user.id, email: user.email });

      console.log(`\n🔑 로그인: ${email}`);

      res.json({
        token,
        user: serializeUser(user),
      });
    } catch (err) {
      handleRouteError(res, err, "로그인 오류");
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        res.status(404).json({ errorCode: "USER_NOT_FOUND", error: "유저를 찾을 수 없습니다." });
        return;
      }

      res.json(serializeUser(user));
    } catch (err) {
      handleRouteError(res, err, "내 정보 조회 오류");
    }
  });

  app.patch("/api/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const { name, currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) { res.status(404).json({ error: "유저를 찾을 수 없습니다." }); return; }

      const updateData: { name?: string; password?: string } = {};

      if (name !== undefined) {
        const trimmed = typeof name === "string" ? name.trim() : "";
        if (!trimmed) { res.status(400).json({ error: "이름을 입력해주세요." }); return; }
        updateData.name = trimmed;
      }

      if (newPassword !== undefined) {
        if (!currentPassword) { res.status(400).json({ error: "현재 비밀번호를 입력해주세요." }); return; }
        const valid = await verifyPassword(currentPassword, user.password);
        if (!valid) { res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다." }); return; }
        if (typeof newPassword !== "string" || newPassword.length < PASSWORD_MIN) {
          res.status(400).json({ error: `새 비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` }); return;
        }
        if (!PASSWORD_RE.test(newPassword)) {
          res.status(400).json({ error: "새 비밀번호에 영문과 숫자가 각각 1자 이상 포함되어야 합니다." }); return;
        }
        updateData.password = await hashPassword(newPassword);
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: "변경할 항목이 없습니다." }); return;
      }

      const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
      res.json(serializeUser(updated));
    } catch (err) {
      handleRouteError(res, err, "프로필 수정 오류");
    }
  });

  app.post("/api/contact", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, email } = getAuthedUser(req);
      const subject = typeof req.body.subject === "string" ? req.body.subject.trim() : "";
      const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

      if (!subject || !message) {
        res.status(400).json({ error: "subject와 message는 필수입니다." }); return;
      }

      console.log(`\n📩 문의 접수 [${new Date().toISOString()}]`);
      console.log(`   보낸 사람: ${email} (${userId})`);
      console.log(`   제목: ${subject}`);
      console.log(`   내용: ${message.substring(0, 200)}${message.length > 200 ? "..." : ""}`);

      // 이메일 발송 (설정 없으면 콘솔만)
      await Promise.allSettled([
        sendContactEmail({ fromEmail: email, fromUserId: userId, subject, message }),
        sendContactConfirmEmail({ toEmail: email, subject }),
      ]);

      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, "문의 접수 오류");
    }
  });

  /** POST /api/auth/forgot-password — 재설정 메일 발송 (비로그인) */
  app.post("/api/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "이메일을 입력해주세요." }); return;
      }
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      // 사용자 존재 여부를 노출하지 않음 — 항상 200 반환
      if (user) {
        const token = randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1시간
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordResetToken: token, passwordResetExpiry: expiry },
        });
        await sendPasswordResetEmail({
          toEmail: user.email,
          resetToken: token,
          appBaseUrl: process.env.APP_BASE_URL || "https://widea.kr",
        });
      }
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, "비밀번호 재설정 메일 오류");
    }
  });

  /** POST /api/auth/reset-password — 토큰으로 비밀번호 변경 (비로그인) */
  app.post("/api/auth/reset-password", async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        res.status(400).json({ error: "유효하지 않은 링크입니다." }); return;
      }
      if (!password || typeof password !== "string" || password.length < PASSWORD_MIN) {
        res.status(400).json({ error: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.` }); return;
      }
      if (!PASSWORD_RE.test(password)) {
        res.status(400).json({ error: "비밀번호에 영문과 숫자가 각각 1자 이상 포함되어야 합니다." }); return;
      }

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        res.status(400).json({ error: "링크가 만료됐거나 이미 사용된 링크입니다." }); return;
      }

      const hashed = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null },
      });

      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, "비밀번호 재설정 오류");
    }
  });

  /* ─── GET /api/auth/lookup?email=... ─────────────────────
     이메일로 유저 ID 조회 (워크스페이스 멤버 추가용, 인증 필요) */
  app.get("/api/auth/lookup", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const email    = typeof req.query.email    === "string" ? req.query.email.toLowerCase().trim() : "";
      const userCode = typeof req.query.userCode === "string" ? req.query.userCode.toUpperCase().trim() : "";

      if (!email && !userCode) {
        res.status(400).json({ error: "email 또는 userCode 파라미터가 필요합니다." });
        return;
      }

      const user = email
        ? await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, userCode: true } })
        : await prisma.user.findFirst({ where: { userCode }, select: { id: true, name: true, email: true, userCode: true } });

      if (!user) {
        res.status(404).json({ error: "해당 사용자를 찾을 수 없습니다." });
        return;
      }

      res.json({ user });
    } catch (err) {
      handleRouteError(res, err, "사용자 조회 오류");
    }
  });

  app.post("/api/auth/set-user-type", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const { userType } = req.body;

      if (!userType || !["FOUNDER", "EXPERT"].includes(userType)) {
        res.status(400).json({ errorCode: "INVALID_USER_TYPE", error: "유효한 userType이 필요합니다: FOUNDER, EXPERT" });
        return;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { userType: userType as any },
      });

      res.json(serializeUser(user));
    } catch (err) {
      handleRouteError(res, err, "사용자 유형 설정 오류");
    }
  });
}
