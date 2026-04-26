import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || GMAIL_USER;

function isConfigured(): boolean {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function send(opts: SendOptions): Promise<void> {
  if (!isConfigured()) {
    console.log(`[Email] 미설정 — 발송 생략. to=${opts.to} subject=${opts.subject}`);
    return;
  }
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"Widea" <${GMAIL_USER}>`,
    ...opts,
  });
}

/* ── 문의 수신 (운영자에게) ─────────────────────────── */
export async function sendContactEmail(opts: {
  fromEmail: string;
  fromUserId: string;
  subject: string;
  message: string;
}): Promise<void> {
  if (!SUPPORT_EMAIL) return;
  await send({
    to: SUPPORT_EMAIL,
    subject: `[Widea 문의] ${opts.subject}`,
    html: `
      <p><strong>보낸 사람:</strong> ${opts.fromEmail} (${opts.fromUserId})</p>
      <p><strong>제목:</strong> ${opts.subject}</p>
      <hr />
      <pre style="font-family:inherit;white-space:pre-wrap">${opts.message}</pre>
    `,
    text: `보낸 사람: ${opts.fromEmail}\n제목: ${opts.subject}\n\n${opts.message}`,
  });
}

/* ── 문의 접수 확인 (사용자에게) ───────────────────── */
export async function sendContactConfirmEmail(opts: {
  toEmail: string;
  subject: string;
}): Promise<void> {
  await send({
    to: opts.toEmail,
    subject: `[Widea] 문의가 접수되었습니다`,
    html: `
      <p>안녕하세요,</p>
      <p>아래 문의가 정상적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.</p>
      <p><strong>제목:</strong> ${opts.subject}</p>
      <hr />
      <p style="color:#888;font-size:12px">Widea — <a href="https://widea.kr">widea.kr</a></p>
    `,
    text: `문의가 접수되었습니다.\n제목: ${opts.subject}\n\n빠른 시일 내에 답변드리겠습니다.`,
  });
}

/* ── 비밀번호 재설정 링크 ───────────────────────── */
export async function sendPasswordResetEmail(opts: {
  toEmail: string;
  resetToken: string;
  appBaseUrl: string;
}): Promise<void> {
  const resetUrl = `${opts.appBaseUrl}/reset-password?token=${opts.resetToken}`;
  await send({
    to: opts.toEmail,
    subject: `[Widea] 비밀번호 재설정 안내`,
    html: `
      <p>안녕하세요,</p>
      <p>비밀번호 재설정 요청이 접수되었습니다. 아래 버튼을 눌러 1시간 이내에 완료해주세요.</p>
      <p style="margin-top:24px">
        <a href="${resetUrl}" style="background:#1d2a24;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          비밀번호 재설정하기
        </a>
      </p>
      <p style="margin-top:16px;color:#888;font-size:12px">요청하지 않으셨다면 이 메일을 무시하세요.</p>
      <hr />
      <p style="color:#888;font-size:12px">Widea — <a href="https://widea.kr">widea.kr</a></p>
    `,
    text: `비밀번호 재설정: ${resetUrl}\n\n요청하지 않으셨다면 이 메일을 무시하세요.`,
  });
}

/* ── 팀 초대 (초대받은 사람에게) ──────────────────── */
export async function sendTeamInviteEmail(opts: {
  toEmail: string;
  projectTitle: string;
  inviterEmail: string;
  role: string;
  inviteToken: string;
  appBaseUrl: string;
}): Promise<void> {
  const acceptUrl = `${opts.appBaseUrl}/team/accept?token=${opts.inviteToken}`;
  await send({
    to: opts.toEmail,
    subject: `[Widea] ${opts.inviterEmail}님이 팀에 초대했습니다`,
    html: `
      <p>안녕하세요,</p>
      <p><strong>${opts.inviterEmail}</strong>님이 Widea 프로젝트 <strong>${opts.projectTitle}</strong>에 <strong>${opts.role}</strong> 역할로 초대했습니다.</p>
      <p style="margin-top:24px">
        <a href="${acceptUrl}" style="background:#1d2a24;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          초대 수락하기
        </a>
      </p>
      <p style="margin-top:16px;color:#888;font-size:12px">이 링크는 1회만 사용 가능합니다.</p>
      <hr />
      <p style="color:#888;font-size:12px">Widea — <a href="https://widea.kr">widea.kr</a></p>
    `,
    text: `${opts.inviterEmail}님이 ${opts.projectTitle} 프로젝트에 초대했습니다.\n\n초대 수락: ${acceptUrl}`,
  });
}
