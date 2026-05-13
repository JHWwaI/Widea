import { test, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const stateFile = path.join(__dirname, '.demo-state.json');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as {
  founder: { email: string; password: string; userId: string; name: string };
  expert: { email: string; password: string; userId: string; name: string };
  ideaId: string;
};

const RECORDINGS_DIR = path.join(__dirname, 'recordings');
fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

// ───────── overlay helpers ─────────
async function injectOverlay(page: Page) {
  try {
    await page.addStyleTag({
      content: `
        #__demo_sub {
          position: fixed; left: 50%; bottom: 48px; transform: translateX(-50%);
          background: rgba(15,15,20,0.92); color: #fff;
          padding: 16px 36px; border-radius: 16px;
          font-size: 22px; line-height: 1.45; font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", sans-serif;
          z-index: 999999; max-width: 86%; text-align: center;
          box-shadow: 0 12px 32px rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.08);
          letter-spacing: -0.01em;
        }
        #__demo_badge {
          position: fixed; top: 24px; left: 24px;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          color: #fff; padding: 8px 18px; border-radius: 999px;
          font-size: 14px; font-weight: 700;
          font-family: -apple-system, sans-serif;
          z-index: 999999; box-shadow: 0 6px 18px rgba(99,102,241,0.4);
        }
      `,
    });
    await page.evaluate(() => {
      if (!document.getElementById('__demo_sub')) {
        const sub = document.createElement('div');
        sub.id = '__demo_sub';
        document.body.appendChild(sub);
      }
      if (!document.getElementById('__demo_badge')) {
        const b = document.createElement('div');
        b.id = '__demo_badge';
        b.textContent = '🎬 Widea';
        document.body.appendChild(b);
      }
    });
  } catch {}
}

async function say(page: Page, text: string) {
  await injectOverlay(page);
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

class SceneTimer {
  t0: number;
  page: Page;
  constructor(page: Page) { this.page = page; this.t0 = Date.now(); }
  async waitUntil(seconds: number) {
    const target = seconds * 1000;
    const elapsed = Date.now() - this.t0;
    if (elapsed < target) await this.page.waitForTimeout(target - elapsed);
  }
}

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

async function injectAuth(page: Page, token: string) {
  await page.goto('/');
  await page.evaluate((t) => { localStorage.setItem('widea_token', t); }, token);
}

// ───────── storyboard demo ─────────
async function storyboard(page: Page) {
  const t = new SceneTimer(page);
  const { ideaId } = state;
  const expertId = state.expert.userId;

  // 00:00 ~ 00:05  대시보드
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page);
  await say(page, 'Widea — AI 창업 워크스페이스');
  await t.waitUntil(5);

  // 00:05 ~ 00:18  idea-match Step 2 (수익 모델)
  await page.goto('/idea-match');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page);
  await say(page, '관심 산업 · 수익 모델 · 타깃 시장');

  // Step 1: 산업 — AI & Data, SaaS & B2B 선택 후 다음
  await tryClick(async () => { await page.getByRole('button', { name: /AI & Data/i }).first().click(); });
  await tryClick(async () => { await page.getByRole('button', { name: /SaaS & B2B/i }).first().click(); });
  await page.waitForTimeout(700);
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  await page.waitForTimeout(700);
  // Step 2: 수익 모델 화면에서 머무름
  await tryClick(async () => { await page.getByRole('button', { name: /SaaS 구독/ }).first().click(); });
  await injectOverlay(page);
  await say(page, '관심 산업 · 수익 모델 · 타깃 시장');
  await t.waitUntil(15);
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  await page.waitForTimeout(500);
  // Step 3 → 4 빠르게 통과
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  await page.waitForTimeout(400);
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  await page.waitForTimeout(500);
  await t.waitUntil(18);

  // 00:18 ~ 00:28  Step 5 (실행 역량 — 2~3인 선택)
  await injectOverlay(page);
  await say(page, 'AI가 글로벌 성공 사례에서 매칭');
  await tryClick(async () => { await page.getByRole('button', { name: /2~3인/ }).first().click(); });
  await page.waitForTimeout(500);
  const skillInput = page.locator('#skills');
  if (await skillInput.count()) await skillInput.fill('React, AI/ML, 프로덕트 기획');
  await t.waitUntil(28);

  // 00:28 ~ 00:43  결과 페이지 (3개 카드)
  // 실제 생성은 시간이 걸리므로 미리 시드된 sessionId 가 있으면 그쪽으로 가고, 아니면 생성 트리거
  await tryClick(async () => { await page.getByRole('button', { name: /^다음$/ }).first().click(); });
  await page.waitForTimeout(500);
  await tryClick(async () => { await page.getByRole('button', { name: /아이디어 생성|생성하기|시작/ }).first().click(); });
  // results 로 이동할 때까지 대기 (최대 10s)
  const resultsDeadline = Date.now() + 10000;
  while (Date.now() < resultsDeadline && !/idea-match\/results/.test(page.url())) {
    await page.waitForTimeout(500);
  }
  // 그래도 안 갔으면 강제로 마이페이지 → 가장 최근 세션 결과로
  if (!/idea-match\/results/.test(page.url())) {
    await page.goto('/mypage').catch(() => {});
    await page.waitForTimeout(800);
  }
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page);
  await say(page, '한국 시장 맞춤 아이디어를 자동 생성');
  await t.waitUntil(43);

  // 00:43 ~ 00:47  3번째 카드 클릭 → idea 상세
  await injectOverlay(page);
  await say(page, '마음에 드는 아이디어를 선택');
  const cards = page.locator('a[href^="/ideas/"]');
  const cardCount = await cards.count();
  if (cardCount >= 3) {
    await cards.nth(2).click({ timeout: 5000 }).catch(() => {});
  } else if (cardCount >= 1) {
    await cards.first().click({ timeout: 5000 }).catch(() => {});
  } else {
    // fallback — 시드된 idea 상세로
    await page.goto(`/ideas/${ideaId}`);
  }
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await t.waitUntil(47);

  // 00:47 ~ 01:00  워크스페이스 (사업자등록 등)
  // idea 상세에서 "워크스페이스로 이동" 류 버튼이 있으면 클릭, 아니면 직접 이동
  await tryClick(async () => {
    await page.getByRole('link', { name: /워크스페이스/ }).first().click({ timeout: 2000 });
  });
  if (!/\/workspace\//.test(page.url())) {
    await page.goto(`/workspace/${ideaId}?tab=stages`);
  }
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);
  await injectOverlay(page);
  await say(page, '전용 워크스페이스에서 실행으로');
  // 단계 1 "서류 정비" 펼치기 — 사업자등록 항목 강조
  await tryClick(async () => {
    await page.locator('button').filter({ hasText: /서류 정비|^1단계|Stage 1/ }).first().click();
  });
  await t.waitUntil(60);

  // 01:00 ~ 01:15  전문가 찾기
  await page.goto('/talent');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page);
  await say(page, '분야별 전문가를 검색하고');
  // 검색 입력 시연
  const searchBox = page.locator('input[placeholder*="검색"]').first();
  if (await searchBox.count()) {
    await searchBox.fill('React');
    await page.waitForTimeout(800);
    await searchBox.fill('');
    await page.waitForTimeout(300);
    await searchBox.fill('기획');
    await page.waitForTimeout(500);
  }
  await t.waitUntil(72);

  // 박준영 프로필로 진입
  await page.goto(`/u/${expertId}`);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await injectOverlay(page);
  await say(page, '분야별 전문가를 검색하고');
  await t.waitUntil(75);

  // 01:15 ~ 01:27  협업 요청 form: "스팟" 선택 + "함께 만들어가요" → 전송
  await injectOverlay(page);
  await say(page, '협업 요청으로 팀원으로 초대');
  await tryClick(async () => {
    await page.getByText(/워크스페이스 협업 요청/).first().click();
  });
  await page.waitForTimeout(800);

  // 아이디어 select — "스팟"이 있으면 선택, 없으면 첫 옵션
  const select = page.locator('select').first();
  if (await select.count()) {
    const opts = select.locator('option');
    const n = await opts.count();
    let matched = false;
    for (let i = 0; i < n; i++) {
      const label = (await opts.nth(i).textContent()) || '';
      if (/스팟|Spot|spot/i.test(label)) {
        const value = await opts.nth(i).getAttribute('value');
        if (value) {
          await select.selectOption(value);
          matched = true;
          break;
        }
      }
    }
    if (!matched && n > 0) {
      const value = await opts.nth(0).getAttribute('value');
      if (value) await select.selectOption(value);
    }
  }
  await page.waitForTimeout(400);

  const msgArea = page.locator('textarea').first();
  if (await msgArea.count()) {
    await msgArea.fill('함께 만들어가요');
  }
  await page.waitForTimeout(800);
  await tryClick(async () => {
    await page.getByRole('button', { name: /요청 보내기|전송/ }).first().click();
  });
  await page.waitForTimeout(1000);
  await injectOverlay(page);
  await say(page, '협업 요청으로 팀원으로 초대');
  await t.waitUntil(87);
}

test('Widea — 87초 스토리보드 시연', async ({ browser }) => {
  test.setTimeout(240_000);

  const founderToken = await preauthToken(state.founder.email, state.founder.password);

  // warm-up (비녹화) — Next dev 서버 라우트 컴파일
  const warmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const warmPage = await warmCtx.newPage();
  await injectAuth(warmPage, founderToken);
  const warmRoutes = [
    '/dashboard',
    '/idea-match',
    '/idea-match/results',
    `/workspace/${state.ideaId}?tab=stages`,
    `/ideas/${state.ideaId}`,
    '/talent',
    `/u/${state.expert.userId}`,
    '/mypage',
    '/',
  ];
  for (const r of warmRoutes) {
    await warmPage.goto(r).catch(() => {});
    await warmPage.waitForLoadState('domcontentloaded').catch(() => {});
  }
  await warmCtx.close();

  // 녹화 컨텍스트
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(RECORDINGS_DIR, 'storyboard'), size: { width: 1440, height: 900 } },
  });
  const page = await ctx.newPage();
  await injectAuth(page, founderToken);

  await storyboard(page);

  await ctx.close();
});
