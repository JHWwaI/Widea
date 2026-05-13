/**
 * 플랜 가격·크레딧 — 결제 검증·구독 활성화에 사용.
 * 프론트 카드/UI 메타는 src/lib/plans.ts (PLAN_META) 사용.
 */
export const PLAN_CONFIG: Record<string, { price: number; credits: number; label: string; maxMembers: number; category: "personal" | "team" }> = {
  // 개인 (3단계 — Free / Plus / Pro)
  FREE:       { price: 0,      credits: 50,    label: "Free",       maxMembers: 1,  category: "personal" },
  PRO:        { price: 9900,   credits: 250,   label: "Plus",       maxMembers: 1,  category: "personal" },
  PRO_PLUS:   { price: 19900,  credits: 600,   label: "Pro",        maxMembers: 1,  category: "personal" },
  // 팀 (워크스페이스 단위)
  STARTER:    { price: 14900,  credits: 300,   label: "Starter",    maxMembers: 3,  category: "team" },
  TEAM:       { price: 39000,  credits: 800,   label: "Team",       maxMembers: 8,  category: "team" },
  TEAM_PLUS:  { price: 79000,  credits: 1500,  label: "Team Plus",  maxMembers: 15, category: "team" },
  // 0 = 별도 견적 (Toss 결제 X)
  ENTERPRISE: { price: 0,      credits: 0,     label: "Enterprise", maxMembers: 0,  category: "team" },
};

