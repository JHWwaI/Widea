/**
 * 1분 30초 시연용 데이터 시드.
 *  - 창업자: dolchi37@gmail.com (기존)
 *  - 전문가: expert.demo@widea.test (박준영, 기존) — 비밀번호 expert1234 로 리셋
 *  - GeneratedIdea "오토 — AI 자동화 비서" + 6단계 (단계1 5/15 진행)
 *  - 팀 모집 게시판 더미 글 3개
 *  - 워크스페이스 채팅 메시지 1개
 *  - 캘린더 일정 1개
 *
 * 실행:
 *   npx tsx --env-file=.env tests-demo/setup-collab.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();
const FOUNDER_PASSWORD = "widea1234";
const EXPERT_PASSWORD = "expert1234";

async function main() {
  const founder = await prisma.user.findUniqueOrThrow({ where: { email: "dolchi37@gmail.com" } });
  const expert = await prisma.user.findUniqueOrThrow({ where: { email: "expert.demo@widea.test" } });

  // 비밀번호 보장
  await prisma.user.update({
    where: { id: founder.id },
    data: { password: await hashPassword(FOUNDER_PASSWORD) },
  });
  await prisma.user.update({
    where: { id: expert.id },
    data: { password: await hashPassword(EXPERT_PASSWORD) },
  });

  // 박준영 ExpertProfile 보장
  await prisma.expertProfile.upsert({
    where: { userId: expert.id },
    create: {
      userId: expert.id,
      category: "UI_UX_DESIGNER",
      headline: "B2B SaaS · 모바일 UI/UX 디자이너 · 4주 MVP 빌드 경험",
      bio: "토스·당근 출신 디자이너. 디자인 시스템 · IA · 하이파이 시안까지 일관된 결과물을 빠르게 만듭니다.",
      skills: ["Figma", "Design System", "User Research", "Prototyping", "Webflow"],
      hourlyRateMin: 60000,
      hourlyRateMax: 110000,
      yearsOfExperience: 6,
      location: "서울 · 원격 가능",
      availability: "주 20시간",
      workMode: "HYBRID",
      languages: ["한국어", "영어"],
    },
    update: {
      headline: "B2B SaaS · 모바일 UI/UX 디자이너 · 4주 MVP 빌드 경험",
      skills: ["Figma", "Design System", "User Research", "Prototyping", "Webflow"],
    },
  });

  // 기존 "오토" 아이디어 정리
  const existing = await prisma.generatedIdea.findMany({
    where: { titleKo: "오토 — AI 자동화 비서", session: { projectPolicy: { userId: founder.id } } },
    select: { id: true, sessionId: true },
  });
  for (const e of existing) {
    await prisma.generatedIdea.delete({ where: { id: e.id } }).catch(() => {});
    await prisma.ideaMatchSession.delete({ where: { id: e.sessionId } }).catch(() => {});
  }

  // ProjectPolicy
  let policy = await prisma.projectPolicy.findFirst({ where: { userId: founder.id, title: "오토 자동화" } });
  if (!policy) {
    policy = await prisma.projectPolicy.create({
      data: {
        userId: founder.id,
        title: "오토 자동화",
        targetMarket: "B2B",
        industries: ["AI & Data", "SaaS & B2B"],
        problemKeywords: "스타트업 팀 반복 업무 자동화",
      },
    });
  }

  const session = await prisma.ideaMatchSession.create({
    data: {
      searchQuery: "AI 자동화 비서 SaaS",
      matchedCases: [],
      localizedIdeas: { ideas: [] },
      projectPolicyId: policy.id,
    },
  });

  const idea = await prisma.generatedIdea.create({
    data: {
      sessionId: session.id,
      rank: 1,
      status: "SELECTED",
      titleKo: "오토 — AI 자동화 비서",
      oneLinerKo: "스타트업 팀의 반복 업무를 AI가 자동화해주는 워크스페이스 비서",
      summaryKo: "회의 정리·할 일 분배·문서 초안을 AI가 자동 처리.",
      rawIdea: { source: "manual-seed" },
      requiresCredit: false,
    },
  });

  // 6단계 — 1단계는 15개 태스크, 그 중 5개 DONE
  const stageNames = ["서류 정비", "팀 구성", "기획·설계", "개발", "배포·테스트", "마케팅·첫100명"];

  // Stage 1 — 15 tasks, 5 DONE
  const stage1Tasks = [
    "사업자등록 신청",
    "법인 인감 발급",
    "도메인 widea-auto.com 구매",
    "사업용 통장 개설",
    "전자세금계산서 가입",
    "회사 메일 (G Suite) 설정",
    "공동인증서 발급",
    "사무실 주소 확정",
    "초기 운영 자금 산정",
    "정부지원사업 후보 3개 리스트업",
    "법무 자문 변호사 컨택",
    "지식재산권(상표) 출원 검토",
    "회계사 컨택 및 계약",
    "주주명부 작성",
    "이용약관·개인정보처리방침 초안",
  ];

  for (let i = 0; i < 6; i++) {
    const status = i === 0 ? "ACTIVE" : "PENDING";
    const stage = await prisma.workspaceStage.create({
      data: { ideaId: idea.id, stageNumber: i + 1, name: stageNames[i], status },
    });
    if (i === 0) {
      for (let j = 0; j < stage1Tasks.length; j++) {
        await prisma.workspaceTask.create({
          data: {
            stageId: stage.id,
            content: stage1Tasks[j],
            status: j < 5 ? "DONE" : "PENDING",
            orderIndex: j,
            isCustom: false,
          },
        });
      }
    } else {
      const sampleTasks = [
        `${stageNames[i]} — 핵심 과제 정의`,
        `${stageNames[i]} — 담당자 지정`,
        `${stageNames[i]} — 마감일 설정`,
      ];
      for (let j = 0; j < sampleTasks.length; j++) {
        await prisma.workspaceTask.create({
          data: {
            stageId: stage.id,
            content: sampleTasks[j],
            status: "PENDING",
            orderIndex: j,
            isCustom: false,
          },
        });
      }
    }
  }

  // 창업자 OWNER 등록
  await prisma.ideaWorkspaceMember.upsert({
    where: { ideaId_userId: { ideaId: idea.id, userId: founder.id } },
    create: { ideaId: idea.id, userId: founder.id, role: "OWNER" },
    update: { role: "OWNER" },
  });

  // 박준영이 이미 멤버라면 제거 (요청 → 수락 흐름을 시연하기 위해)
  await prisma.ideaWorkspaceMember
    .delete({ where: { ideaId_userId: { ideaId: idea.id, userId: expert.id } } })
    .catch(() => {});

  // 채팅 1개 (빈 느낌 제거)
  await prisma.workspaceMessage.create({
    data: {
      ideaId: idea.id,
      authorId: founder.id,
      content: "오늘 팀원 모집 글 올렸습니다. 디자이너 한 분 함께하면 좋겠어요.",
    },
  });

  // 기존 협업 요청 정리
  await prisma.expertCollabRequest
    .deleteMany({ where: { ideaId: idea.id, expertUserId: expert.id } })
    .catch(() => {});

  // 팀 모집 게시판 더미 글 3개 (워크스페이스 빈 페이지 방지)
  const dummyAuthors = await prisma.user.findMany({
    where: { email: { in: ["alice@widea.test", "carol@widea.test", "eve@widea.test"] } },
    select: { id: true, email: true },
  });
  await prisma.communityPost.deleteMany({ where: { title: { startsWith: "[데모]" } } }).catch(() => {});
  const dummyPosts = [
    { title: "[데모] HRTech SaaS · 백엔드 개발자 모집", content: "Node + Postgres 풀스택 풀타임 1명 모집. 시드 단계." },
    { title: "[데모] B2C 콘텐츠 큐레이션 · 마케터 합류", content: "콘텐츠/SEO 강한 분 주 10시간 협업." },
    { title: "[데모] AI 헬스케어 MVP · PM 1명", content: "와이어프레임~출시까지 동행할 PM. 8주." },
  ];
  for (let i = 0; i < dummyPosts.length; i++) {
    await prisma.communityPost.create({
      data: {
        title: dummyPosts[i].title,
        content: dummyPosts[i].content,
        category: "TEAM_RECRUIT",
        authorId: dummyAuthors[i % dummyAuthors.length].id,
      },
    });
  }

  // 캘린더 일정 1개 (내일 14:00)
  await prisma.projectMeeting.deleteMany({ where: { projectId: policy.id, title: { contains: "데모" } } }).catch(() => {});
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(14, 0, 0, 0);
  await prisma.projectMeeting.create({
    data: {
      title: "주간 진척 점검 (데모)",
      roomId: `widea-demo-${Date.now()}`,
      scheduledAt: tomorrow,
      agenda: "단계 1 서류 정비 마감 / 팀원 모집 글 검토",
      projectId: policy.id,
      createdById: founder.id,
    },
  });

  const stateFile = path.join(__dirname, ".demo-state.json");
  fs.writeFileSync(
    stateFile,
    JSON.stringify(
      {
        founder: { email: founder.email, password: FOUNDER_PASSWORD, userId: founder.id, name: founder.name, userCode: founder.userCode },
        expert: { email: expert.email, password: EXPERT_PASSWORD, userId: expert.id, name: expert.name, userCode: expert.userCode },
        ideaId: idea.id,
        policyId: policy.id,
      },
      null,
      2,
    ),
  );

  console.log("Seed OK.");
  console.log("  ideaId:", idea.id);
  console.log("  founder:", founder.email, "(", founder.name, ") pw =", FOUNDER_PASSWORD);
  console.log("  expert :", expert.email, "(", expert.name, ") pw =", EXPERT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
