/**
 * 데모용 임의 사용자 6명 시드.
 *
 * 사용법:
 *   pnpm tsx --env-file=.env scripts/seed_demo_users.ts
 *   pnpm tsx --env-file=.env scripts/seed_demo_users.ts --reset    # 기존 같은 이메일 삭제 후 재생성
 *
 * 실행 후 콘솔에 (이메일 / 비밀번호 / userCode) 표가 출력됨.
 * 시크릿 창으로 그 계정 로그인하면 다른 사용자 입장에서 워크스페이스·DM·외주 신청을 시연할 수 있다.
 */

import "dotenv/config";
import { PrismaClient, UserType, ExpertCategory } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

// 비밀번호는 모두 동일 — 데모 시연 편의용
const DEMO_PASSWORD = "Demo1234!";

type DemoUser = {
  email: string;
  name: string;
  userCode: string; // 6자 대문자+숫자
  userType: UserType;
  expert?: {
    category: ExpertCategory;
    headline: string;
    bio: string;
    skills: string[];
    hourlyRateMin?: number;
    hourlyRateMax?: number;
    yearsOfExperience: number;
    location: string;
    availability: string;
    workMode: "REMOTE" | "HYBRID" | "ONSITE";
  };
};

const DEMO_USERS: DemoUser[] = [
  {
    email: "alice@widea.test",
    name: "김민지",
    userCode: "ALICE1",
    userType: "FOUNDER",
    // 본인 워크스페이스 멤버로 추가될 수 있는 풀스택 개발자
    expert: {
      category: "FULLSTACK_DEV",
      headline: "Next.js·Node 풀스택 · 시드 스타트업 3개 MVP 빌드 경험",
      bio: "토스·당근 출신 풀스택. 0→1 MVP 4주 안에 출시 가능. PostgreSQL·Prisma·React에 강합니다.",
      skills: ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "Prisma", "AWS"],
      hourlyRateMin: 60000,
      hourlyRateMax: 120000,
      yearsOfExperience: 7,
      location: "서울",
      availability: "주 20시간 (사이드)",
      workMode: "REMOTE",
    },
  },
  {
    email: "bob@widea.test",
    name: "이도윤",
    userCode: "BOBDEM",
    userType: "FOUNDER",
    // UI/UX 디자이너
    expert: {
      category: "UI_UX_DESIGNER",
      headline: "B2B SaaS · 모바일앱 UI/UX 디자이너 · Figma 시스템 빌드",
      bio: "쏘카·카카오 출신 디자이너. 디자인 시스템부터 IA·Wire·하이파이까지 일관된 결과물을 만듭니다.",
      skills: ["Figma", "Design System", "User Research", "Prototyping", "Webflow"],
      hourlyRateMin: 50000,
      hourlyRateMax: 90000,
      yearsOfExperience: 5,
      location: "서울 · 원격 가능",
      availability: "주 15시간",
      workMode: "HYBRID",
    },
  },
  {
    email: "carol@widea.test",
    name: "박서영",
    userCode: "CAROL3",
    userType: "FOUNDER",
    // 그로스 마케터
    expert: {
      category: "MARKETER",
      headline: "B2C 그로스 마케터 · 첫 1000명 → 10만 MAU 사례 보유",
      bio: "오늘의집·무신사 출신 마케터. 콘텐츠 마케팅·SEO·바이럴 루프 설계·온보딩 전환율 개선 위주.",
      skills: ["Growth", "SEO", "Content Marketing", "GA4", "Mixpanel", "Notion"],
      hourlyRateMin: 70000,
      hourlyRateMax: 130000,
      yearsOfExperience: 6,
      location: "원격",
      availability: "주말만",
      workMode: "REMOTE",
    },
  },
  {
    email: "dan@widea.test",
    name: "최준호",
    userCode: "DANIEL",
    userType: "EXPERT",
    // AC / 멘토
    expert: {
      category: "AC_MENTOR",
      headline: "프리A · 시드 단계 사업 검증 멘토 · 정부지원사업 사례 연구",
      bio: "스파크랩 시니어 멤버 출신. 시드 라운드 IR 덱 30개 이상 멘토링. K-PMF 평가 프레임 활용.",
      skills: ["IR Coaching", "PMF Validation", "정부지원사업", "Pitch Deck"],
      yearsOfExperience: 12,
      location: "서울",
      availability: "주 5시간 (1:1 콜)",
      workMode: "HYBRID",
    },
  },
  {
    email: "eve@widea.test",
    name: "정아영",
    userCode: "EVEDEV",
    userType: "FOUNDER",
    // 백엔드 개발자
    expert: {
      category: "BACKEND_DEV",
      headline: "결제·금융 도메인 백엔드 · 토스·카카오페이 결제 연동 다수",
      bio: "PG 연동·정산 시스템 빌드 전문. 트랜잭션 무결성·webhooks·이중 지불 방지 설계 강점.",
      skills: ["Java", "Kotlin", "Spring", "Toss Payments", "Kafka", "Redis"],
      hourlyRateMin: 80000,
      hourlyRateMax: 150000,
      yearsOfExperience: 9,
      location: "서울 · 원격 가능",
      availability: "풀타임 가능",
      workMode: "REMOTE",
    },
  },
  {
    email: "frank@widea.test",
    name: "한지훈",
    userCode: "FRANKK",
    userType: "EXPERT",
    // 투자자 — expert는 안 만듦 (투자자는 별도)
  },
];

async function ensureUser(d: DemoUser): Promise<{ created: boolean; userId: string }> {
  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) {
    return { created: false, userId: existing.id };
  }

  const password = await hashPassword(DEMO_PASSWORD);
  const created = await prisma.user.create({
    data: {
      email: d.email,
      password,
      name: d.name,
      userCode: d.userCode,
      userType: d.userType,
    },
  });

  if (d.expert) {
    await prisma.expertProfile.create({
      data: {
        userId: created.id,
        category: d.expert.category,
        headline: d.expert.headline,
        bio: d.expert.bio,
        skills: d.expert.skills,
        hourlyRateMin: d.expert.hourlyRateMin ?? null,
        hourlyRateMax: d.expert.hourlyRateMax ?? null,
        yearsOfExperience: d.expert.yearsOfExperience,
        location: d.expert.location,
        availability: d.expert.availability,
        workMode: d.expert.workMode,
        languages: ["한국어"],
      },
    });
  }

  return { created: true, userId: created.id };
}

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("[reset] 기존 데모 사용자 삭제 중...");
    await prisma.user.deleteMany({
      where: { email: { in: DEMO_USERS.map((u) => u.email) } },
    });
  }

  let created = 0;
  let skipped = 0;
  for (const d of DEMO_USERS) {
    const r = await ensureUser(d);
    if (r.created) created++;
    else skipped++;
  }

  console.log("\n────────────────────────────────────────────");
  console.log(`  신규 생성: ${created}명 / 이미 존재: ${skipped}명`);
  console.log("────────────────────────────────────────────\n");

  // 안내 표 출력
  console.log("로그인 정보 (모두 비밀번호 동일: " + DEMO_PASSWORD + ")\n");
  console.log("│ 이름        │ 이메일                  │ ID(태그) │ 역할");
  console.log("├─────────────┼─────────────────────────┼──────────┼──────────");
  for (const d of DEMO_USERS) {
    const role = d.userType === "FOUNDER" ? "창업가" : "전문가";
    console.log(
      `│ ${d.name.padEnd(11)} │ ${d.email.padEnd(23)} │ ${d.userCode.padEnd(8)} │ ${role}${d.expert ? " · " + d.expert.headline.slice(0, 30) + (d.expert.headline.length > 30 ? "…" : "") : ""}`,
    );
  }

  console.log("\n사용 팁:");
  console.log("  · 본인 계정 워크스페이스 → 멤버 탭 → '추가' 폼에 위 ID(6자) 입력");
  console.log("  · 시크릿 창으로 위 계정 로그인하면 양방향 (DM·요청 수락 등) 시연 가능");
  console.log("  · /talent 페이지에 expertProfile 가진 사용자 5명 표시됨\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
