/**
 * 구독 플랜 정의 (프론트용 — 백엔드 src/lib/plans.ts 와 키·라벨 동기화).
 */

export type PlanType = "FREE" | "STARTER" | "PRO" | "PRO_PLUS" | "TEAM" | "TEAM_PLUS" | "ENTERPRISE";
export type PlanCategory = "personal" | "team";

export type PlanMeta = {
  key: PlanType;
  category: PlanCategory;
  label: string;
  priceKrw: number;
  maxMembers: number;
  monthlyCredits: number;
  tagline: string;
  features: string[];
  badge?: "popular" | "best_value";
};

export const PLAN_META: Record<PlanType, PlanMeta> = {
  FREE: {
    key: "FREE",
    category: "personal",
    label: "Free",
    priceKrw: 0,
    maxMembers: 1,
    monthlyCredits: 50,
    tagline: "혼자 아이디어 검증부터 시작",
    features: [
      "솔로 워크스페이스 1개",
      "AI 크레딧 50 (가입 시 1회)",
      "외주 글 게시 1회",
      "회의록 AI 요약 월 3회",
    ],
  },
  PRO: {
    key: "PRO",
    category: "personal",
    label: "Plus",
    priceKrw: 9900,
    maxMembers: 1,
    monthlyCredits: 250,
    tagline: "솔로 창업자가 가볍게 시작",
    badge: "popular",
    features: [
      "솔로 워크스페이스 무제한",
      "AI 크레딧 250/월",
      "외주 글 게시 5회/월",
      "회의록 AI 요약·docx 무제한",
      "데이터 export (.docx)",
    ],
  },
  PRO_PLUS: {
    key: "PRO_PLUS",
    category: "personal",
    label: "Pro",
    priceKrw: 19900,
    maxMembers: 1,
    monthlyCredits: 600,
    tagline: "본격 빌드·검증 — 헤비 사용자",
    features: [
      "Plus의 모든 기능",
      "AI 크레딧 600/월",
      "외주 글 게시 무제한",
      "전문가 매칭 우선순위",
      "정부지원사업 매칭",
      "우선 고객 지원",
    ],
  },
  STARTER: {
    key: "STARTER",
    category: "team",
    label: "Starter",
    priceKrw: 14900,
    maxMembers: 3,
    monthlyCredits: 300,
    tagline: "공동창업자 + AC와 함께",
    features: [
      "팀원 3명까지",
      "AI 크레딧 300/월",
      "외주 글 게시 5회/월",
      "회의록 AI 요약·docx 무제한",
      "전체 워크스페이스 종합 일정",
    ],
  },
  TEAM: {
    key: "TEAM",
    category: "team",
    label: "Team",
    priceKrw: 39000,
    maxMembers: 8,
    monthlyCredits: 800,
    tagline: "본격 팀 빌딩 단계",
    badge: "best_value",
    features: [
      "팀원 8명까지",
      "AI 크레딧 800/월",
      "외주 글 게시 무제한",
      "전문가 매칭 우선순위",
      "정부지원사업 매칭",
      "회의록·데이터 export 무제한",
    ],
  },
  TEAM_PLUS: {
    key: "TEAM_PLUS",
    category: "team",
    label: "Team Plus",
    priceKrw: 79000,
    maxMembers: 15,
    monthlyCredits: 1500,
    tagline: "확장 단계 — 시리즈 A 준비",
    features: [
      "팀원 15명까지",
      "AI 크레딧 1,500/월",
      "전문가 매칭 우선순위",
      "정부지원사업 매칭 + 컨설팅",
      "Team의 모든 기능",
    ],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    category: "team",
    label: "Enterprise",
    priceKrw: 0,
    maxMembers: 0,
    monthlyCredits: 0,
    tagline: "시리즈 A+ · 전담 매니저",
    features: [
      "팀원 무제한",
      "AI 크레딧 협의",
      "전담 CSM",
      "SSO · SLA · 보안 검토",
      "맞춤 통합 (Slack·Notion 등)",
    ],
  },
};

export const PERSONAL_PLANS: PlanMeta[] = [PLAN_META.FREE, PLAN_META.PRO, PLAN_META.PRO_PLUS];
export const TEAM_PLANS: PlanMeta[] = [
  PLAN_META.STARTER,
  PLAN_META.TEAM,
  PLAN_META.TEAM_PLUS,
  PLAN_META.ENTERPRISE,
];

export function formatKrw(n: number): string {
  return n.toLocaleString("ko-KR");
}
