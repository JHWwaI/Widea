import { test, Page, BrowserContext, chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const stateFile = path.join(__dirname, '.demo-state.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as {
  founder: { email: string; password: string; userId: string; name: string };
  expert: { email: string; password: string; userId: string; name: string };
  ideaId: string;
  policyId: string;
};

const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const FOUNDER_STATE = path.join(RECORDINGS_DIR, 'founder.storage.json');
const EXPERT_STATE = path.join(RECORDINGS_DIR, 'expert.storage.json');

fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

// ───────── overlay helpers ─────────
async function injectOverlay(page: Page, role: string) {
  try {
    await page.addStyleTag({
      content: `
        #__demo_sub {
          position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%);
          background: rgba(15,15,20,0.92); color: #fff;
          padding: 14px 30px; border-radius: 14px;
          font-size: 20px; line-height: 1.45; font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", sans-serif;
          z-index: 999999; max-width: 86%; text-align: center;
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.08);
          letter-spacing: -0.01em;
        }
        #__demo_badge {
          position: fixed; top: 24px; left: 24px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          color: #fff; padding: 8px 18px; border-radius: 999px;
          font-size: 14px; font-weight: 700; letter-spacing: .3px;
          font-family: -apple-system, sans-serif;
          z-index: 999999; box-shadow: 0 6px 18px rgba(99,102,241,0.4);
        }
        #__demo_role {
          position: fixed; top: 24px; right: 24px;
          background: rgba(0,0,0,0.75); color: #fff;
          padding: 6px 14px; border-radius: 999px;
          font-size: 13px; font-weight: 600;
          font-family: -apple-system, sans-serif;
          z-index: 999999;
        }
      `,
    });
    await page.evaluate(({ role }) => {
      if (!document.getElementById('__demo_sub')) {
        const sub = document.createElement('div');
        sub.id = '__demo_sub';
        document.body.appendChild(sub);
      }
      if (!document.getElementById('__demo_badge')) {
        const b = document.createElement('div');
        b.id = '__demo_badge';
        b.textContent = '🎬 Widea — 1분 30초 시연';
        document.body.appendChild(b);
      }
      if (!document.getElementById('__demo_role')) {
        const r = document.createElement('div');
        r.id = '__demo_role';
        r.textContent = role;
        document.body.appendChild(r);
      }
    }, { role });
  } catch {}
}

async function say(page: Page, role: string, text: string) {
  await injectOverlay(page, role);
  try {
    await page.evaluate((t) => {
      const el = document.getElementById('__demo_sub');
      if (el) el.textContent = t;
    }, text);
  } catch {}
}

async function tryClick(fn: () => Promise<void>) {
  try { await fn(); } catch {}
}

// scene-timer: each scene ends at an absolute timestamp from t0
class SceneTimer {
  t0: number;
  page: Page;
  constructor(page: Page) { this.page = page; this.t0 = Date.now(); }
  async waitUntil(seconds: number) {
    const target = seconds * 1000;
    const elapsed = Date.now() - this.t0;
    if (elapsed < target) await this.page.waitForTimeout(target - elapsed);
  }
  elapsed() { return (Date.now() - this.t0) / 1000; }
}

// ───────── pre-auth setup via API (no recording) ─────────
async function preauthToken(email: string, password: string): Promise<string> {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

// 토큰을 페이지 localStorage 에 주입 — origin 의 / 페이지로 우선 이동한 뒤 set
async function injectAuth(page: Page, token: string) {
  await page.goto('/');
  await page.evaluate((t) => { localStorage.setItem('widea_token', t); }, token);
}

// ───────── founder timeline (recorded) ─────────
async function founderDemo(page: Page) {
  const t = new SceneTimer(page);
  const ROLE = '창업자 (이재환)';
  const { ideaId } = state;
  const expertId = state.expert.userId;
  const expertName = state.expert.name;

  // 00:00 ~ 00:05 OPENING
  await page.goto('/');
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '창업 아이디어부터 팀 협업까지 — Widea');
  await t.waitUntil(2.5);
  await page.goto('/idea-match');
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '글로벌 사례에서 한국형 아이디어를, 워크스페이스에서 팀과 실행까지.');
  await t.waitUntil(5);

  // 00:05 ~ 00:20 IDEA GENERATION
  await say(page, ROLE, '100개 글로벌 사례 + 한국화 RAG');
  // Step 1 — 산업
  await tryClick(async () => { await page.getByRole('button', { name: /AI & Data/i }).first().click(); });
  await tryClick(async () => { await page.getByRole('button', { name: /SaaS & B2B/i }).first().click(); });
  await page.waitForTimeout(600);
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  // Step 2 — 수익 모델
  await tryClick(async () => { await page.getByRole('button', { name: /SaaS 구독/ }).first().click(); });
  await page.waitForTimeout(400);
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  // Step 3 — 타깃 시장
  await tryClick(async () => {
    await page.locator('button').filter({ hasText: /^B2B$/ }).filter({ hasText: '기업' }).first().click();
  });
  const tc = page.locator('#targetCustomer');
  if (await tc.count()) await tc.fill('직원 50명 이하 IT 스타트업');
  await page.waitForTimeout(500);
  await say(page, ROLE, '산업·예산·역량 입력 → 가장 가까운 글로벌 케이스 매칭.');
  await t.waitUntil(15);
  // Step 4 (fast)
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  await say(page, ROLE, '[아이디어 생성] — AI가 한국형 아이디어 3개를 즉시 제안.');
  await t.waitUntil(20);

  // 00:20 ~ 00:40 WORKSPACE (선정 → 자동 생성된 워크스페이스로 이동)
  await page.goto(`/workspace/${ideaId}?tab=stages`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '선정된 아이디어 → 워크스페이스 자동 생성.');
  await t.waitUntil(24);
  await say(page, ROLE, '6단계 로드맵 — 서류·팀·기획·개발·배포·마케팅');
  await t.waitUntil(28);

  // 단계 1 펼치기
  await tryClick(async () => {
    await page.locator('button').filter({ hasText: /서류 정비|^1단계|Stage 1/ }).first().click();
  });
  await page.waitForTimeout(800);
  await say(page, ROLE, '단계 1 "서류 정비" — 15개 태스크 중 5개 완료.');
  await t.waitUntil(33);

  // 6번째 태스크 체크 (5/15 → 6/15)
  const checkboxes = page.locator('input[type="checkbox"]');
  const cnt = await checkboxes.count();
  if (cnt > 5) {
    await checkboxes.nth(5).click({ timeout: 3000 }).catch(() => {});
  }
  await say(page, ROLE, '태스크 체크 → 진척률이 실시간으로 반영.');
  await t.waitUntil(40);

  // 00:40 ~ 00:55 COMMUNITY
  await page.goto('/community');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '커뮤니티 — 외주 · 전문 컨설팅 · 팀 모집을 한 곳에서.');
  await t.waitUntil(44);

  // 팀 모집 카테고리 보기
  await page.goto('/community?category=TEAM_RECRUIT');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '"팀 모집" 카테고리 — 다른 창업가 글도 한눈에.');
  await t.waitUntil(49);

  // 글쓰기 페이지로 (입력만 빠르게)
  await page.goto('/community/new?category=TEAM_RECRUIT');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  const titleInput = page.locator('input[placeholder*="제목"], input[name="title"]').first();
  if (await titleInput.count()) {
    await titleInput.fill('오토 — 풀스택 1명 모집 (4주 MVP)');
  }
  const bodyArea = page.locator('textarea').first();
  if (await bodyArea.count()) {
    await bodyArea.fill('Next + Node 풀스택 1명. 4주 MVP. 초기 멤버 지분 + 월 30만원.');
  }
  await say(page, ROLE, '"오토 — 풀스택 1명 모집" 빠르게 작성·게시.');
  await t.waitUntil(55);

  // 00:55 ~ 01:10 SPLIT-SCREEN: TALENT POOL + COLLAB REQUEST (★)
  await page.goto(`/u/${expertId}`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, `인재 풀 → "${expertName}" 프로필로 이동.`);
  await t.waitUntil(59);

  await tryClick(async () => {
    await page.getByText(/워크스페이스 협업 요청/).first().click();
  });
  await page.waitForTimeout(600);
  const msgArea = page.locator('textarea').first();
  if (await msgArea.count()) {
    await msgArea.fill('오토 디자인 합류 부탁드립니다. 기획·설계부터 함께해요!');
  }
  await say(page, ROLE, '워크스페이스 "오토" 선택 → 메시지 전송.');
  await t.waitUntil(64);
  await tryClick(async () => {
    await page.getByRole('button', { name: /요청 보내기|전송/ }).first().click();
  });
  await page.waitForTimeout(1000);
  await say(page, ROLE, '협업 요청 전송 → 박준영에게 실시간 알림 도착.');
  await t.waitUntil(70);

  // 멤버 탭으로 — 봇이 수락하면 박준영이 보이게 됨
  await page.goto(`/workspace/${ideaId}?tab=members`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '수락 즉시 워크스페이스 멤버에 자동 합류.');
  // Wait until expert appears (bot should have accepted by now)
  const memberDeadline = Date.now() + 8000;
  while (Date.now() < memberDeadline) {
    if (await page.getByText(expertName).count()) break;
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  await injectOverlay(page, ROLE);
  await t.waitUntil(78);

  // 01:10(=78s 시작) ~ 01:25 CHAT + SCHEDULE
  await page.goto(`/workspace/${ideaId}?tab=stages`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1000);
  await injectOverlay(page, ROLE);
  await say(page, ROLE, 'WebSocket 기반 실시간 채팅 · 캘린더 · 회의록.');
  await t.waitUntil(80);

  const chatInput = page.locator('textarea[placeholder*="메시지"]').first();
  if (await chatInput.count()) {
    await chatInput.fill('@박준영 내일 14시 킥오프 미팅 어떠세요?');
    await page.waitForTimeout(400);
    await tryClick(async () => {
      await page.getByRole('button', { name: '전송' }).first().click();
    });
  }
  await say(page, ROLE, '"@박준영 내일 14시 킥오프 미팅 어떠세요?"');
  // Wait for bot reply
  const replyDeadline = Date.now() + 8000;
  while (Date.now() < replyDeadline) {
    if (await page.getByText(/좋아요|네|드릴게요|잡아주세요/).count()) break;
    await page.waitForTimeout(700);
  }
  await say(page, ROLE, `박준영의 답장 즉시 도착 — 양방향 실시간.`);
  await t.waitUntil(86);

  // 미팅 탭 (캘린더 일정 미리 시드됨)
  await page.goto(`/workspace/${ideaId}?tab=meetings`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '+ 일정 → "MVP 킥오프" 내일 14:00 저장 → 캘린더 동기화.');
  await t.waitUntil(90);

  // 01:30 OUTRO
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '아이디어 → 실행 → 협업 — Widea');
  await t.waitUntil(95);
}

// ───────── expert bot timeline (recorded too, for split-screen) ─────────
async function expertBot(page: Page) {
  const t = new SceneTimer(page);
  const ROLE = '박준영 (전문가)';
  const { ideaId } = state;

  // 0~55s: 알림함에서 대기 (시크릿 창 박준영 로그인 + 알림함 페이지 대기)
  await page.goto('/mypage/inbox');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '전문가 박준영 — 알림함에서 대기 중.');
  await t.waitUntil(20);
  await say(page, ROLE, '워크스페이스 협업 요청을 실시간으로 받습니다.');

  // 55~70s: 협업 요청 도착 → 수락
  // 새 요청 도착 polling
  await t.waitUntil(56);
  let accepted = false;
  const acceptDeadline = Date.now() + 10000;
  while (Date.now() < acceptDeadline && !accepted) {
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await injectOverlay(page, ROLE);
    const acceptBtn = page.getByRole('button', { name: /수락/ }).first();
    if (await acceptBtn.count()) {
      await say(page, ROLE, '🔔 협업 요청 도착 — [수락] 클릭.');
      await page.waitForTimeout(800);
      await acceptBtn.click({ timeout: 4000 }).catch(() => {});
      accepted = true;
      break;
    }
    await page.waitForTimeout(800);
  }
  await say(page, ROLE, '수락 완료 → 워크스페이스 "오토"에 자동 합류.');
  await t.waitUntil(70);

  // 70~78s: 워크스페이스 합류 화면
  await page.goto(`/workspace/${ideaId}?tab=members`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '워크스페이스 멤버로 합류 — 즉시 협업 가능.');
  await t.waitUntil(78);

  // 78~86s: 채팅 화면, 메시지 도착 대기 → 답장
  await page.goto(`/workspace/${ideaId}?tab=stages`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page, ROLE);
  await say(page, ROLE, '채팅창에서 창업자 메시지를 기다립니다.');

  const msgDeadline = Date.now() + 6000;
  while (Date.now() < msgDeadline) {
    if (await page.getByText(/킥오프 미팅|14시/).count()) break;
    await page.waitForTimeout(600);
  }
  await say(page, ROLE, '"@박준영 내일 14시 킥오프 미팅 어떠세요?" 수신 ✓');
  await page.waitForTimeout(1200);

  const input = page.locator('textarea[placeholder*="메시지"]').first();
  if (await input.count()) {
    await input.fill('좋아요 잡아주세요!');
    await page.waitForTimeout(400);
    await tryClick(async () => {
      await page.getByRole('button', { name: '전송' }).first().click();
    });
  }
  await say(page, ROLE, '"좋아요 잡아주세요!" 답장 전송.');
  await t.waitUntil(90);

  await say(page, ROLE, '실시간 협업 — Widea');
  await t.waitUntil(95);
}

test('Widea — 1분 30초 종합 시연 (창업자 + 박준영)', async ({ browser }) => {
  test.setTimeout(360_000);

  // 토큰 발급
  const founderToken = await preauthToken(state.founder.email, state.founder.password);
  const expertToken = await preauthToken(state.expert.email, state.expert.password);

  // 사전 컴파일 (비녹화) — Next dev 서버가 라우트를 컴파일하도록 한 번씩 방문
  const warmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const warmPage = await warmCtx.newPage();
  await injectAuth(warmPage, founderToken);
  const warmRoutes = [
    '/idea-match',
    `/workspace/${state.ideaId}?tab=stages`,
    `/workspace/${state.ideaId}?tab=members`,
    `/workspace/${state.ideaId}?tab=meetings`,
    '/community',
    '/community?category=TEAM_RECRUIT',
    '/community/new?category=TEAM_RECRUIT',
    `/u/${state.expert.userId}`,
    '/mypage/inbox',
    '/',
  ];
  for (const r of warmRoutes) {
    await warmPage.goto(r).catch(() => {});
    await warmPage.waitForLoadState('domcontentloaded').catch(() => {});
  }
  await warmCtx.close();

  // 녹화용 컨텍스트 (두 개 모두 비디오 ON)
  const founderCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(RECORDINGS_DIR, 'founder'), size: { width: 1440, height: 900 } },
  });
  const expertCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(RECORDINGS_DIR, 'expert'), size: { width: 1440, height: 900 } },
  });

  const founderPage = await founderCtx.newPage();
  const expertPage = await expertCtx.newPage();

  await injectAuth(founderPage, founderToken);
  await injectAuth(expertPage, expertToken);

  await Promise.all([
    founderDemo(founderPage),
    expertBot(expertPage),
  ]);

  await founderCtx.close();
  await expertCtx.close();
});
