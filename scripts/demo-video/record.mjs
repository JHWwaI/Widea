// Widea — first-time-user demo recorder
//
// Usage:
//   1. front: cd frontend && npm run dev          (localhost:3000)
//   2. back:  npm run dev                          (localhost:3001)
//   3. node scripts/demo-video/record.mjs
//
// Output: scripts/demo-video/output/widea-demo.webm  (raw)
//         scripts/demo-video/output/widea-demo.mp4   (if ffmpeg installed)

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FRONT = 'http://localhost:3000';
const BACK  = 'http://localhost:3001';
const DEMO_EMAIL = 'dolchi37@gmail.com';
const DEMO_PASS  = 'widea1234';

const VIEWPORT = { width: 1920, height: 1080 };

// ──────────────────────────────────────────────────────────────────────────
// helpers — pacing, cursor, subtitle injection
// ──────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Inject a fake visible cursor + click-ripple + bottom subtitle bar.
// Playwright's recordVideo does NOT capture the real OS cursor, so we draw one.
async function injectOverlay(page) {
  await page.addStyleTag({
    content: `
      #__widea_cursor {
        position: fixed; top: 0; left: 0; width: 28px; height: 28px;
        background: radial-gradient(circle, #fff 0%, #fff 35%, rgba(0,0,0,0.35) 36%, rgba(0,0,0,0.0) 70%);
        border: 2px solid #111;
        border-radius: 50%;
        pointer-events: none; z-index: 2147483646;
        transform: translate(-50%, -50%);
        transition: transform 0.12s ease-out, opacity 0.2s;
        mix-blend-mode: normal;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      }
      .__widea_ripple {
        position: fixed; width: 12px; height: 12px; border-radius: 50%;
        background: rgba(99, 102, 241, 0.55); border: 2px solid #6366f1;
        pointer-events: none; z-index: 2147483645;
        transform: translate(-50%, -50%) scale(1);
        animation: __widea_ripple 0.7s ease-out forwards;
      }
      @keyframes __widea_ripple {
        to { transform: translate(-50%, -50%) scale(7); opacity: 0; }
      }
      #__widea_subs {
        position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%);
        max-width: 1200px; padding: 18px 32px;
        background: rgba(15, 17, 26, 0.88);
        color: #fff; font-size: 30px; line-height: 1.4; font-weight: 600;
        font-family: -apple-system, "Pretendard", "Apple SD Gothic Neo", sans-serif;
        border-radius: 14px; backdrop-filter: blur(8px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.35);
        opacity: 0; transition: opacity 0.35s ease;
        text-align: center; letter-spacing: -0.01em;
        z-index: 2147483647; pointer-events: none;
      }
      #__widea_subs.show { opacity: 1; }
      #__widea_brand {
        position: fixed; top: 28px; right: 36px;
        padding: 10px 18px; background: rgba(255,255,255,0.92);
        color: #111; font-weight: 800; font-size: 18px; letter-spacing: -0.01em;
        border-radius: 999px; z-index: 2147483647;
        font-family: -apple-system, "Pretendard", sans-serif;
        box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      }
    `,
  });
  await page.evaluate(() => {
    if (!document.getElementById('__widea_cursor')) {
      const c = document.createElement('div'); c.id = '__widea_cursor';
      document.body.appendChild(c);
      const s = document.createElement('div'); s.id = '__widea_subs';
      document.body.appendChild(s);
      const b = document.createElement('div'); b.id = '__widea_brand';
      b.textContent = 'Widea · 첫 사용자 가이드';
      document.body.appendChild(b);
      window.__wideaCursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const apply = () => {
        const c = document.getElementById('__widea_cursor');
        if (c) {
          c.style.transform = `translate(${window.__wideaCursorPos.x}px, ${window.__wideaCursorPos.y}px) translate(-50%,-50%)`;
        }
      };
      apply();
      window.__wideaApplyCursor = apply;
    }
  });
}

// Smooth-move the fake cursor toward (x,y) with easing.
async function moveCursor(page, x, y, steps = 24) {
  await page.evaluate(async ({ x, y, steps }) => {
    const start = window.__wideaCursorPos || { x: 0, y: 0 };
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      window.__wideaCursorPos = {
        x: start.x + (x - start.x) * t,
        y: start.y + (y - start.y) * t,
      };
      window.__wideaApplyCursor();
      await new Promise((r) => setTimeout(r, 14));
    }
  }, { x, y, steps });
}

async function moveCursorToSelector(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) return null;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveCursor(page, x, y);
  return { x, y, box };
}

async function ripple(page, x, y) {
  await page.evaluate(({ x, y }) => {
    const r = document.createElement('div');
    r.className = '__widea_ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 800);
  }, { x, y });
}

async function clickAt(page, selector) {
  const pos = await moveCursorToSelector(page, selector);
  if (!pos) return false;
  await sleep(250);
  await ripple(page, pos.x, pos.y);
  await page.locator(selector).first().click();
  return true;
}

async function showSub(page, text, holdMs = 2400) {
  await page.evaluate((t) => {
    const el = document.getElementById('__widea_subs');
    if (!el) return;
    el.textContent = t;
    el.classList.add('show');
  }, text);
  await sleep(holdMs);
}
async function hideSub(page) {
  await page.evaluate(() => {
    const el = document.getElementById('__widea_subs');
    if (el) el.classList.remove('show');
  });
  await sleep(220);
}
async function sub(page, text, holdMs = 2400) {
  await showSub(page, text, holdMs);
  await hideSub(page);
}

async function smoothScroll(page, toY, durationMs = 1600) {
  await page.evaluate(async ({ toY, durationMs }) => {
    const startY = window.scrollY;
    const delta = toY - startY;
    const start = performance.now();
    const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
    return new Promise((res) => {
      function step(now) {
        const t = Math.min(1, (now - start) / durationMs);
        window.scrollTo(0, startY + delta * ease(t));
        if (t < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  }, { toY, durationMs });
}

async function typeSlow(page, selector, text, perChar = 70) {
  const loc = page.locator(selector).first();
  await loc.click();
  for (const ch of text) {
    await loc.type(ch, { delay: 0 });
    await sleep(perChar);
  }
}

async function loginViaApi(page) {
  // Hit backend, set token in localStorage so AuthContext recognizes session.
  const token = await page.evaluate(async ({ back, email, pass }) => {
    const r = await fetch(`${back}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const j = await r.json();
    if (j.token) {
      localStorage.setItem('widea_token', j.token);
      if (j.user) localStorage.setItem('widea_user', JSON.stringify(j.user));
    }
    return j.token;
  }, { back: BACK, email: DEMO_EMAIL, pass: DEMO_PASS });
  return token;
}

// ──────────────────────────────────────────────────────────────────────────
// scenes
// ──────────────────────────────────────────────────────────────────────────

async function scene_landing(page) {
  await page.goto(FRONT, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(400);

  await sub(page, '아이디어를 실행으로 — Widea에 오신 것을 환영합니다.', 1800);
  await sub(page, '글로벌 사례부터 한국형 실행 전략까지, 한 곳에서.', 1800);

  await smoothScroll(page, 700, 1100);
  await injectOverlay(page);
  await sub(page, 'Discovery · Blueprint · Workspace — 세 단계로 정리됩니다.', 1800);

  await smoothScroll(page, 0, 900);
  await injectOverlay(page);

  const cta = 'a:has-text("지금 무료로 시작하기"), a:has-text("무료로 시작")';
  if (await page.locator(cta).first().count()) {
    await sub(page, '"무료로 시작하기"로 가입해볼게요.', 1500);
    await clickAt(page, cta);
    await page.waitForLoadState('networkidle');
  } else {
    await page.goto(`${FRONT}/register`, { waitUntil: 'networkidle' });
  }
}

async function scene_register(page) {
  await injectOverlay(page);
  await sleep(300);
  await sub(page, '이름·이메일·비밀번호만 있으면 끝. 가입 즉시 50 크레딧.', 1800);

  const nameSel  = 'input[name="name"], input[placeholder*="이름"]';
  const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="이메일"]';
  const passSel  = 'input[type="password"], input[name="password"], input[placeholder*="비밀번호"]';

  if (await page.locator(nameSel).first().count()) {
    await moveCursorToSelector(page, nameSel);
    await typeSlow(page, nameSel, '김위디', 45);
  }
  if (await page.locator(emailSel).first().count()) {
    await moveCursorToSelector(page, emailSel);
    await typeSlow(page, emailSel, 'newuser@widea.demo', 25);
  }
  if (await page.locator(passSel).first().count()) {
    await moveCursorToSelector(page, passSel);
    await typeSlow(page, passSel, 'Widea1234!', 30);
  }
  await sleep(300);
}

async function scene_select_type(page) {
  await loginViaApi(page);
  await page.goto(`${FRONT}/select-type`, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(400);

  await sub(page, '역할을 고르세요 — 창업가 또는 전문가.', 1700);

  const founder = 'button:has-text("창업가"), [data-type="FOUNDER"], button:has-text("FOUNDER")';
  if (await page.locator(founder).first().count()) {
    await clickAt(page, founder);
    await sleep(400);
  }
  const startBtn = 'button:has-text("시작하기"), button:has-text("다음")';
  if (await page.locator(startBtn).first().count()) {
    await clickAt(page, startBtn);
  }
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function scene_idea_match(page) {
  await page.goto(`${FRONT}/idea-match`, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(400);

  await sub(page, '아이디어 매칭 — 산업·예산·팀 규모만 입력.', 1800);
  await smoothScroll(page, 250, 900);
  await injectOverlay(page);
  await sub(page, 'AI가 한국 시장에 맞는 아이디어 3개를 만들어줍니다.', 2000);
  await smoothScroll(page, 600, 1000);
  await injectOverlay(page);
  await sub(page, '바로 "블루프린트"로 변환할 수 있어요.', 1600);
}

async function scene_dashboard(page) {
  await page.goto(`${FRONT}/dashboard`, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(400);
  await sub(page, '대시보드 — 프로젝트와 크레딧을 한눈에.', 1800);
  await smoothScroll(page, 400, 900);
  await injectOverlay(page);
  await sleep(300);
}

async function scene_workspace(page) {
  const projects = await page.evaluate(async ({ back }) => {
    const t = localStorage.getItem('widea_token');
    const r = await fetch(`${back}/api/projects`, { headers: { Authorization: `Bearer ${t}` } });
    return r.json();
  }, { back: BACK });

  const first = projects?.projects?.[0];
  if (first?.id) {
    await page.goto(`${FRONT}/workspace/${first.id}`, { waitUntil: 'networkidle' }).catch(() => {});
    await injectOverlay(page);
    await sleep(500);
    await sub(page, '워크스페이스 — 6단계 33개 task가 자동 생성.', 2000);
    await smoothScroll(page, 500, 1000);
    await injectOverlay(page);
    await sleep(300);
  }
}

async function scene_community(page) {
  await page.goto(`${FRONT}/community`, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(400);
  await sub(page, '커뮤니티에서 다른 창업가와 피드백을.', 1700);
  await smoothScroll(page, 400, 900);
}

async function scene_talent(page) {
  await page.goto(`${FRONT}/talent`, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(400);
  await sub(page, '전문가 마켓에서 바로 의뢰까지.', 1700);
  await smoothScroll(page, 400, 900);
}

async function scene_outro(page) {
  await page.goto(FRONT, { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await sleep(300);
  await sub(page, '아이디어를 실행으로 — 지금 Widea에서.', 2200);
  await sleep(300);
}

// ──────────────────────────────────────────────────────────────────────────
// main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Launching browser…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  const scenes = [
    ['landing',     scene_landing],
    ['register',    scene_register],
    ['select-type', scene_select_type],
    ['idea-match',  scene_idea_match],
    ['dashboard',   scene_dashboard],
    ['workspace',   scene_workspace],
    ['community',   scene_community],
    ['talent',      scene_talent],
    ['outro',       scene_outro],
  ];

  for (const [name, fn] of scenes) {
    console.log(`▶ Scene: ${name}`);
    try {
      await fn(page);
    } catch (e) {
      console.warn(`  (scene ${name} partial — ${e.message})`);
    }
  }

  await context.close();
  await browser.close();

  // Rename the auto-generated video to a stable name.
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'));
  files.sort((a, b) => fs.statSync(path.join(OUT_DIR, b)).mtimeMs - fs.statSync(path.join(OUT_DIR, a)).mtimeMs);
  if (files[0]) {
    const finalWebm = path.join(OUT_DIR, 'widea-demo.webm');
    fs.renameSync(path.join(OUT_DIR, files[0]), finalWebm);
    console.log(`✓ Saved: ${finalWebm}`);

    // Try transcoding to mp4 if ffmpeg is available
    try {
      execSync('which ffmpeg', { stdio: 'ignore' });
      const mp4 = path.join(OUT_DIR, 'widea-demo.mp4');
      console.log('▶ Transcoding to mp4…');
      execSync(`ffmpeg -y -i "${finalWebm}" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart "${mp4}"`, { stdio: 'inherit' });
      console.log(`✓ Saved: ${mp4}`);
    } catch {
      console.log('ℹ ffmpeg not found — keeping .webm only. (brew install ffmpeg)');
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
