/**
 * 시연 폴리시 시드:
 *   1. 모든 전문가에게 DiceBear 무료 아바타 적용
 *   2. AC_REQUEST·IDEA_SHARE 카테고리에 다양한 게시글 추가
 *   3. 댓글·좋아요 일부 보강
 *
 * 사용: npx tsx --env-file=.env scripts/seed_demo_polish.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// 1) DiceBear 아바타 — 무료, API 키 X
// ─────────────────────────────────────────────
async function fetchDicebearAvatar(seed: string, style: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const url = `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(seed)}&size=256&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { b64: buf.toString("base64"), mime: "image/png" };
  } catch {
    return null;
  }
}

const AVATAR_STYLES = ["personas", "lorelei", "notionists", "avataaars", "adventurer"];

async function seedAvatars() {
  console.log("\n[1/3] 전문가 아바타 시드");
  const expertsRaw = await prisma.expertProfile.findMany({
    where: { avatarB64: null },
    select: { id: true, userId: true },
  });
  const userIds = expertsRaw.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const experts = expertsRaw.map((e) => ({ ...e, user: userMap.get(e.userId) ?? null }));
  console.log(`  대상: ${experts.length}명`);

  let success = 0;
  for (let i = 0; i < experts.length; i++) {
    const e = experts[i];
    const name = e.user?.name ?? e.user?.email ?? e.userId;
    const style = AVATAR_STYLES[i % AVATAR_STYLES.length];
    process.stdout.write(`  [${i + 1}/${experts.length}] ${name.padEnd(20)} (${style}) `);
    const a = await fetchDicebearAvatar(name, style);
    if (!a) {
      console.log("✗ 실패");
      continue;
    }
    await prisma.expertProfile.update({
      where: { id: e.id },
      data: { avatarB64: a.b64, avatarMime: a.mime },
    });
    success++;
    console.log("✓");
  }
  console.log(`  완료: ${success}/${experts.length}`);
}

// ─────────────────────────────────────────────
// 2) AC_REQUEST + IDEA_SHARE 게시글 보강
// ─────────────────────────────────────────────
const AC_POSTS = [
  {
    title: "시드 펀딩 IR 덱 검토 부탁드립니다",
    content: "B2B SaaS 시드 라운드 준비 중입니다. IR 덱 12장 작성했는데, 투자자 시각에서 어떤 부분이 약한지 멘토님 한 분 1:1로 30분만 봐주실 수 있을까요? 시급 협의 가능합니다.",
  },
  {
    title: "PMF 검증 단계 — 가설 수립 도움 요청",
    content: "지금 사용자 인터뷰 25명 진행 후 어느 방향으로 갈지 막막합니다. 시드 액셀러레이터 출신 멘토님과 1시간 컨설팅 원합니다. 디스커션 결과를 다음 단계 의사결정에 반영하고 싶습니다.",
  },
  {
    title: "외국인 창업비자(D-8) 신청 컨설팅",
    content: "베트남 국적인 공동창업자가 한국에서 D-8 비자 신청하려고 합니다. 절차·서류·면접 준비까지 경험 있으신 분께 1회 컨설팅 받고 싶어요.",
  },
  {
    title: "K-Startup 정부지원사업 매칭 컨설팅",
    content: "초기창업패키지·청년창업사관학교·DREAM 등 너무 많아서 어디부터 지원해야 할지 모르겠습니다. 우리 팀 단계·아이템에 맞는 사업 선정 컨설팅 부탁드립니다.",
  },
  {
    title: "법인 설립·주주간 계약 자문",
    content: "공동창업자 3명. 지분 분배·vesting·tag-along 조항 등 주주간 계약 작성에 변호사 자문 필요합니다. 시드 라운드 전 정리하고 싶어요.",
  },
  {
    title: "세무·회계 — 시드 단계 베스트 프랙티스",
    content: "법인 설립 직후라 부가세·원천세·법인세 신고가 처음입니다. 세무사님 추천 + 처음 6개월 무엇을 챙겨야 할지 상담 원합니다.",
  },
];

const IDEA_POSTS = [
  {
    title: "1인 가구 반려동물 산책 매칭 앱 — 어떻게 보세요?",
    content: "직장인 1인 가구 + 강아지 키우는 사람 대상. 평일 점심·저녁 30분 산책 대신 도와주는 사람 매칭. 시간당 8천원. 비슷한 미국 서비스로 Rover가 있는데 한국엔 본격 플레이어 없어요. PMF 가능성 어떻게 보시나요?",
  },
  {
    title: "동네 헬스장 회원권 공유 플랫폼 (Classpass 한국형)",
    content: "헬스장 매달 7~10만원 부담스럽고, 또 안 가게 되는 분들 많죠. 여러 헬스장 공유 멤버십 (월 3.9만원에 30회 출입)으로 가볍게 시작해보고 싶습니다. 진입장벽·헬스장 협상이 핵심.",
  },
  {
    title: "오피스 점심 매칭 — 같은 빌딩 사람들과 랜덤 런치",
    content: "혼밥 지겨우신 분들 + 같은 빌딩 다른 회사 사람들과 점심. 일주일 1회 매칭. 강남·여의도·판교 빌딩 단위로 베타. B2B로 확장 가능?",
  },
  {
    title: "지방 폐교 활용 워케이션 호스트 매칭",
    content: "지방 폐교를 게스트하우스·코워킹 스페이스로 리모델링한 운영자와, 1~3개월 워케이션 가는 원격근무자 매칭. 지자체 지원사업 + Airbnb 모델 결합.",
  },
  {
    title: "B2B SaaS — 한국 중소 식당 발주 자동화",
    content: "식자재 발주를 카톡으로 받는 식당이 80%. AI가 카톡 발주 분석 → 재고·결제 자동화. 월 4.9만원 SaaS. 비슷한 미국 사례 Toast 있지만 한국 시장 비어있음.",
  },
];

async function seedPosts() {
  console.log("\n[2/3] 커뮤니티 약한 카테고리 게시글 추가");
  // 게시자 — 기존 사용자 중 일부 회전
  const authors = await prisma.user.findMany({
    where: { email: { endsWith: "@widea.test" } },
    select: { id: true, name: true },
    take: 6,
  });
  if (authors.length === 0) {
    console.log("  ⚠ 데모 사용자 없음 — skip");
    return;
  }

  const now = Date.now();
  for (let i = 0; i < AC_POSTS.length; i++) {
    const p = AC_POSTS[i];
    const author = authors[i % authors.length];
    // 1~7일 전 분산
    const createdAt = new Date(now - (i + 1) * 6 * 3600 * 1000);
    await prisma.communityPost.create({
      data: {
        title: p.title,
        content: p.content,
        category: "AC_REQUEST",
        authorId: author.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    console.log(`  ✓ AC: ${p.title.slice(0, 30)}...`);
  }
  for (let i = 0; i < IDEA_POSTS.length; i++) {
    const p = IDEA_POSTS[i];
    const author = authors[(i + 2) % authors.length];
    const createdAt = new Date(now - (i + 1) * 5 * 3600 * 1000);
    await prisma.communityPost.create({
      data: {
        title: p.title,
        content: p.content,
        category: "IDEA_SHARE",
        authorId: author.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    console.log(`  ✓ Idea: ${p.title.slice(0, 30)}...`);
  }
}

// ─────────────────────────────────────────────
// 3) 새 게시글에 댓글·좋아요 — 활기 부여
// ─────────────────────────────────────────────
const SAMPLE_COMMENTS = [
  "관심 있습니다. DM 주세요!",
  "비슷한 경험 있어서 도움 드릴 수 있어요.",
  "좋은 인사이트네요, 저도 한 번 진행해봤습니다.",
  "이런 방향이면 정부지원 매칭도 가능할 것 같아요.",
  "팀에서 비슷한 고민 중인데 함께 이야기 나누고 싶어요.",
  "구체적인 수치가 있어 신뢰됩니다.",
  "PMF 검증 후 펀딩 라운드까지 같이 가는 멘토링 추천드려요.",
  "한국 시장에서 어렵지만 해볼 만한 시도네요.",
  "비슷한 케이스 미국에선 어떤 KPI를 추적하나요?",
  "초기 사용자 100명 확보까지 어떻게 하실 계획이세요?",
];

async function seedEngagement() {
  console.log("\n[3/3] 새 게시글에 댓글·좋아요 추가");
  const recentPosts = await prisma.communityPost.findMany({
    where: { category: { in: ["AC_REQUEST", "IDEA_SHARE"] } },
    orderBy: { createdAt: "desc" },
    take: 11,
    select: { id: true, authorId: true },
  });
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@widea.test" } },
    select: { id: true },
    take: 6,
  });
  if (users.length === 0) return;

  let cAdd = 0, lAdd = 0;
  for (const post of recentPosts) {
    // 댓글 2~4개
    const commentCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < commentCount; i++) {
      const author = users[(i + post.id.length) % users.length];
      if (author.id === post.authorId) continue;
      const content = SAMPLE_COMMENTS[(i + post.id.length) % SAMPLE_COMMENTS.length];
      try {
        await prisma.postComment.create({
          data: { postId: post.id, authorId: author.id, content },
        });
        cAdd++;
      } catch { /* dup OK */ }
    }
    // 좋아요 3~6개
    const likeCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < likeCount; i++) {
      const liker = users[(i + post.id.length + 1) % users.length];
      try {
        await prisma.postLike.create({
          data: { postId: post.id, userId: liker.id },
        });
        lAdd++;
      } catch { /* unique fail OK */ }
    }
  }
  console.log(`  댓글 +${cAdd}, 좋아요 +${lAdd}`);
}

// ─────────────────────────────────────────────
async function main() {
  console.log("━".repeat(50));
  console.log("  시연 폴리시 시드");
  console.log("━".repeat(50));

  await seedAvatars();
  await seedPosts();
  await seedEngagement();

  console.log("\n" + "━".repeat(50));
  console.log("  완료");
  console.log("━".repeat(50));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
