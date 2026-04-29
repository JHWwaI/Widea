/**
 * 한국 정부지원사업 데이터셋 (2025-2026 기준)
 * 출처: K-Startup 공식 공고, 중소벤처기업부, 창업진흥원, 각 지자체
 *
 * 매년 갱신 필요 — 정확한 공고 일정은 각 기관 공식 사이트 확인 필수
 */

export type ProgramType = "사업화" | "R&D" | "마케팅" | "교육" | "글로벌" | "투자매칭";

export interface GovProgram {
  id: string;
  name: string;
  agency: string;
  programType: ProgramType;

  amount: { min: number; max: number };  // KRW
  durationMonths: number;
  selfBurdenRatio?: number; // 자부담률 (0~1)

  eligibility: {
    foundingYearsMax?: number;
    foundingYearsMin?: number;
    ageMax?: number;
    ageMin?: number;
    industries?: string[]; // 매칭할 산업 키워드
    teamSizeMin?: number;
    requiresCorporation?: boolean;
    requiresPatent?: boolean;
    targetMarket?: ("B2B" | "B2C" | "B2B2C")[];
    notes?: string;
  };

  description: string;
  applicationUrl: string;

  // 신청서 양식 섹션 (AI가 자동 작성할 항목)
  applicationFormSections: string[];

  // 공고 일정
  cohortInfo: {
    typical: string; // "매년 1~2월", "수시 모집" 등
    nextExpected?: string; // ISO date or "TBD"
  };

  // 차별 포인트 (AI 매칭 점수 산정용)
  bestFor?: string[]; // ["AI", "소셜벤처", "여성창업"]
}

export const GOV_PROGRAMS: GovProgram[] = [
  // ────────────────────────────────────────────
  // 1. 핵심 창업 패키지
  // ────────────────────────────────────────────
  {
    id: "yebi-2026",
    name: "예비창업패키지",
    agency: "중소벤처기업부 / 창업진흥원",
    programType: "사업화",
    amount: { min: 50_000_000, max: 100_000_000 },
    durationMonths: 8,
    selfBurdenRatio: 0,
    eligibility: {
      foundingYearsMax: 0,
      ageMin: 19,
      teamSizeMin: 1,
      requiresCorporation: false,
      notes: "사업자등록 이력 없는 예비창업자 (사업개시일 2026년 12월 31일까지)",
    },
    description:
      "예비창업자를 대상으로 사업화 자금 최대 1억원과 멘토링·교육을 8개월간 지원하는 정부 대표 창업지원사업.",
    applicationUrl: "https://www.k-startup.go.kr/main.do",
    applicationFormSections: [
      "창업 아이템 개요 (제품·서비스 개요, 차별성)",
      "문제 인식 (Problem)",
      "실현 가능성 (Solution)",
      "성장 전략 (Scale-up)",
      "팀 구성 (Team)",
      "사업비 사용 계획",
    ],
    cohortInfo: { typical: "매년 2~3월 공고, 4월 마감", nextExpected: "2026-03" },
    bestFor: ["AI", "SaaS", "딥테크", "소비자 서비스"],
  },
  {
    id: "early-2026",
    name: "초기창업패키지",
    agency: "중소벤처기업부 / 창업진흥원",
    programType: "사업화",
    amount: { min: 50_000_000, max: 100_000_000 },
    durationMonths: 10,
    eligibility: {
      foundingYearsMax: 3,
      foundingYearsMin: 0,
      requiresCorporation: true,
    },
    description:
      "창업 3년 이내 초기 스타트업의 시제품 제작, 마케팅, 인력 등 사업화에 필요한 자금을 최대 1억원 지원.",
    applicationUrl: "https://www.k-startup.go.kr/main.do",
    applicationFormSections: [
      "사업 개요 및 추진 실적",
      "사업 모델 및 시장 분석",
      "기술/서비스 차별성",
      "사업화 추진 계획 (10개월)",
      "재무 계획 및 자금 사용 명세",
    ],
    cohortInfo: { typical: "매년 3~4월 공고", nextExpected: "2026-04" },
    bestFor: ["B2B SaaS", "이커머스", "FinTech", "헬스케어"],
  },
  {
    id: "leap-2026",
    name: "도약패키지",
    agency: "중소벤처기업부 / 창업진흥원",
    programType: "사업화",
    amount: { min: 100_000_000, max: 300_000_000 },
    durationMonths: 12,
    eligibility: {
      foundingYearsMax: 7,
      foundingYearsMin: 3,
      requiresCorporation: true,
      notes: "전년도 매출 1억원 이상 또는 누적 투자 5억원 이상",
    },
    description:
      "창업 3~7년차 도약기 기업을 위한 스케일업 자금 최대 3억원 지원. 글로벌 진출, 대규모 마케팅, 제품 고도화 등.",
    applicationUrl: "https://www.k-startup.go.kr/main.do",
    applicationFormSections: [
      "회사 소개 및 핵심 성과",
      "사업 모델 검증 결과 (KPI, MRR, 사용자수)",
      "스케일업 전략",
      "투자 유치 계획",
      "자금 사용 계획 (3억)",
    ],
    cohortInfo: { typical: "매년 5~6월 공고", nextExpected: "2026-05" },
  },

  // ────────────────────────────────────────────
  // 2. TIPS 계열 (R&D 매칭형)
  // ────────────────────────────────────────────
  {
    id: "tips-2026",
    name: "TIPS 프로그램",
    agency: "중소벤처기업부 / 한국엔젤투자협회",
    programType: "R&D",
    amount: { min: 200_000_000, max: 500_000_000 },
    durationMonths: 24,
    selfBurdenRatio: 0.2,
    eligibility: {
      foundingYearsMax: 7,
      requiresCorporation: true,
      notes: "TIPS 운영사로부터 1억원 이상 선투자 확보 필수",
    },
    description:
      "민간 운영사(VC/AC) 1억원 + 정부 R&D 자금 최대 5억원 매칭. 기술 기반 스타트업 대상.",
    applicationUrl: "https://www.jointips.or.kr/",
    applicationFormSections: [
      "기술 개발 과제 정의",
      "선행 기술 조사 및 차별성",
      "개발 일정 (24개월 마일스톤)",
      "사업화 전략",
      "참여 인력 및 R&D 역량",
      "운영사 추천서 (별도)",
    ],
    cohortInfo: { typical: "수시 모집 (운영사 선투자 후)", nextExpected: "수시" },
    bestFor: ["AI", "딥테크", "BioTech", "소부장", "메타버스"],
  },
  {
    id: "pre-tips-2026",
    name: "Pre-TIPS",
    agency: "중소벤처기업부",
    programType: "R&D",
    amount: { min: 50_000_000, max: 100_000_000 },
    durationMonths: 12,
    eligibility: {
      foundingYearsMax: 7,
      requiresCorporation: true,
      notes: "TIPS 진입 전 단계 기업, 운영사 추천 필요",
    },
    description: "TIPS 진입을 준비하는 기업 대상. R&D 1억원 + 멘토링 12개월.",
    applicationUrl: "https://www.jointips.or.kr/",
    applicationFormSections: [
      "기술 개발 계획",
      "TIPS 진입 로드맵",
      "운영사 추천서",
    ],
    cohortInfo: { typical: "수시", nextExpected: "수시" },
    bestFor: ["AI", "딥테크"],
  },
  {
    id: "post-tips-2026",
    name: "Post-TIPS",
    agency: "중소벤처기업부",
    programType: "R&D",
    amount: { min: 500_000_000, max: 1_500_000_000 },
    durationMonths: 36,
    eligibility: {
      foundingYearsMax: 10,
      requiresCorporation: true,
      notes: "TIPS 졸업 기업 또는 동급 성과 보유 기업",
    },
    description:
      "TIPS 졸업 후 스케일업 단계 기업 대상. 글로벌 진출/대규모 R&D에 최대 15억원.",
    applicationUrl: "https://www.jointips.or.kr/",
    applicationFormSections: [
      "TIPS 졸업 성과",
      "글로벌 사업 계획",
      "추가 R&D 계획",
    ],
    cohortInfo: { typical: "매년 1회", nextExpected: "2026-06" },
  },

  // ────────────────────────────────────────────
  // 3. 청년·여성·재도전 특화
  // ────────────────────────────────────────────
  {
    id: "youth-academy-2026",
    name: "청년창업사관학교",
    agency: "중소벤처기업부 / 중소벤처기업진흥공단",
    programType: "사업화",
    amount: { min: 50_000_000, max: 100_000_000 },
    durationMonths: 12,
    eligibility: {
      foundingYearsMax: 3,
      ageMax: 39,
      teamSizeMin: 1,
      requiresCorporation: false,
      notes: "만 39세 이하, 창업 3년 이내",
    },
    description:
      "청년 창업자를 위한 12개월 합숙형 패키지. 사업화 자금 최대 1억원 + 사무실 + 멘토링.",
    applicationUrl: "https://start.kosmes.or.kr/",
    applicationFormSections: [
      "창업 아이템 소개",
      "팀 구성 및 역할",
      "12개월 마일스톤",
      "기대 성과",
    ],
    cohortInfo: { typical: "매년 1~2월 공고", nextExpected: "2026-02" },
    bestFor: ["청년창업", "B2C 서비스", "콘텐츠"],
  },
  {
    id: "women-startup-2026",
    name: "여성창업경진대회 (도약형)",
    agency: "여성기업종합지원센터",
    programType: "사업화",
    amount: { min: 30_000_000, max: 100_000_000 },
    durationMonths: 8,
    eligibility: {
      requiresCorporation: false,
      notes: "여성 대표자 (예비/초기/도약 분야 별도)",
    },
    description: "여성 창업자 대상 사업화 자금 + 멘토링. 분야별 차등 지원.",
    applicationUrl: "https://www.wbiz.or.kr/",
    applicationFormSections: [
      "사업 아이템 및 차별성",
      "여성창업으로서의 강점",
      "사업 추진 계획",
    ],
    cohortInfo: { typical: "매년 5~7월", nextExpected: "2026-06" },
    bestFor: ["여성창업"],
  },
  {
    id: "rechallenge-2026",
    name: "재도전성공패키지",
    agency: "중소벤처기업부",
    programType: "사업화",
    amount: { min: 30_000_000, max: 60_000_000 },
    durationMonths: 10,
    eligibility: {
      notes: "폐업 경험이 있는 재창업자 (3년 이상 경과)",
    },
    description: "재창업자 대상 사업화 자금 6천만원 + 채무조정 컨설팅.",
    applicationUrl: "https://www.k-startup.go.kr/main.do",
    applicationFormSections: [
      "이전 사업 실패 분석 (Lessons Learned)",
      "재도전 사업 아이템",
      "재기 전략",
    ],
    cohortInfo: { typical: "매년 3~4월", nextExpected: "2026-03" },
    bestFor: ["재창업", "재도전"],
  },

  // ────────────────────────────────────────────
  // 4. 글로벌 진출
  // ────────────────────────────────────────────
  {
    id: "global-tips-2026",
    name: "글로벌 TIPS",
    agency: "중소벤처기업부",
    programType: "글로벌",
    amount: { min: 600_000_000, max: 1_200_000_000 },
    durationMonths: 36,
    selfBurdenRatio: 0.15,
    eligibility: {
      foundingYearsMax: 7,
      requiresCorporation: true,
      notes: "해외 진출 의지 + 글로벌 운영사 매칭 필요",
    },
    description: "해외 시장 진출 목표 스타트업 대상. R&D + 글로벌 마케팅 최대 12억원.",
    applicationUrl: "https://www.jointips.or.kr/",
    applicationFormSections: [
      "글로벌 시장 분석",
      "타겟 국가 진출 전략",
      "현지 파트너십 계획",
      "R&D + 글로벌 마케팅 예산",
    ],
    cohortInfo: { typical: "수시 (운영사 선투자 후)", nextExpected: "수시" },
    bestFor: ["글로벌", "수출"],
  },
  {
    id: "k-startup-grand-2026",
    name: "K-Startup Grand Challenge",
    agency: "중소벤처기업부",
    programType: "글로벌",
    amount: { min: 50_000_000, max: 100_000_000 },
    durationMonths: 4,
    eligibility: {
      requiresCorporation: false,
      notes: "외국인 창업자 또는 한국 진출 희망 외국 스타트업",
    },
    description: "한국 진출 희망 외국 스타트업 대상 4개월 액셀러레이션 + 사업화 자금.",
    applicationUrl: "https://www.k-startupgc.org/",
    applicationFormSections: ["Company Pitch (English)", "Korea Market Entry Plan"],
    cohortInfo: { typical: "매년 5~6월", nextExpected: "2026-05" },
    bestFor: ["글로벌", "외국인 창업"],
  },

  // ────────────────────────────────────────────
  // 5. R&D 전용 (산업기술)
  // ────────────────────────────────────────────
  {
    id: "rnd-creative-2026",
    name: "창업성장기술개발사업 (디딤돌)",
    agency: "중소벤처기업부",
    programType: "R&D",
    amount: { min: 100_000_000, max: 200_000_000 },
    durationMonths: 12,
    selfBurdenRatio: 0.2,
    eligibility: {
      foundingYearsMax: 7,
      requiresCorporation: true,
    },
    description: "기술 기반 창업기업의 R&D 과제 지원. 정부 80% + 자부담 20%.",
    applicationUrl: "https://www.smtech.go.kr/",
    applicationFormSections: [
      "기술 개발 목표 및 내용",
      "선행 특허 분석",
      "사업화 계획",
      "참여 연구원",
    ],
    cohortInfo: { typical: "매년 1~2월", nextExpected: "2026-02" },
    bestFor: ["딥테크", "AI", "BioTech", "소부장"],
  },
  {
    id: "rnd-strategic-2026",
    name: "전략형 창업과제",
    agency: "중소벤처기업부",
    programType: "R&D",
    amount: { min: 300_000_000, max: 600_000_000 },
    durationMonths: 24,
    selfBurdenRatio: 0.2,
    eligibility: {
      foundingYearsMax: 7,
      requiresCorporation: true,
      notes: "12대 국가전략기술 분야 (AI, 양자, 바이오, 우주, 반도체 등)",
    },
    description: "국가전략기술 분야 R&D 최대 6억원. 창업성장기술개발사업의 상위 트랙.",
    applicationUrl: "https://www.smtech.go.kr/",
    applicationFormSections: [
      "국가전략기술과의 연관성",
      "기술 개발 목표",
      "사업화 로드맵",
    ],
    cohortInfo: { typical: "매년 2월", nextExpected: "2026-02" },
    bestFor: ["AI", "양자", "BioTech", "반도체", "우주"],
  },

  // ────────────────────────────────────────────
  // 6. 지자체 / 특화
  // ────────────────────────────────────────────
  {
    id: "seoul-startup-2026",
    name: "서울창업허브 입주기업 지원",
    agency: "서울특별시 / 서울창업허브",
    programType: "사업화",
    amount: { min: 20_000_000, max: 50_000_000 },
    durationMonths: 12,
    eligibility: {
      foundingYearsMax: 5,
      requiresCorporation: true,
      notes: "서울 소재 또는 서울 이전 의향",
    },
    description: "서울 소재 스타트업 대상 사업화 자금 + 무료 사무공간 + 멘토링.",
    applicationUrl: "https://seoulstartuphub.com/",
    applicationFormSections: ["사업 개요", "서울 입주 사유", "12개월 계획"],
    cohortInfo: { typical: "수시 모집", nextExpected: "수시" },
    bestFor: ["서울", "사무실 필요"],
  },
  {
    id: "busan-startup-2026",
    name: "부산 청년창업 지원사업",
    agency: "부산광역시 / 부산창조경제혁신센터",
    programType: "사업화",
    amount: { min: 30_000_000, max: 50_000_000 },
    durationMonths: 10,
    eligibility: {
      foundingYearsMax: 3,
      ageMax: 39,
      notes: "부산 소재 청년 창업자",
    },
    description: "부산 청년창업자 대상 사업화 자금 + 액셀러레이션.",
    applicationUrl: "https://busancreativecenter.kr/",
    applicationFormSections: ["사업 아이템", "부산 연고/이전 계획"],
    cohortInfo: { typical: "매년 4월", nextExpected: "2026-04" },
    bestFor: ["부산", "청년창업"],
  },

  // ────────────────────────────────────────────
  // 7. 사회적 가치 / 소셜벤처
  // ────────────────────────────────────────────
  {
    id: "social-venture-2026",
    name: "소셜벤처 육성사업",
    agency: "한국사회적기업진흥원",
    programType: "사업화",
    amount: { min: 30_000_000, max: 100_000_000 },
    durationMonths: 10,
    eligibility: {
      foundingYearsMax: 7,
      notes: "사회적 가치 창출이 명확한 사업 모델",
    },
    description: "사회 문제 해결형 스타트업 대상 자금 + 임팩트 측정 컨설팅.",
    applicationUrl: "https://www.socialenterprise.or.kr/",
    applicationFormSections: [
      "해결하려는 사회 문제",
      "임팩트 측정 지표 (Theory of Change)",
      "사업 모델",
    ],
    cohortInfo: { typical: "매년 3~5월", nextExpected: "2026-03" },
    bestFor: ["소셜벤처", "ESG", "교육", "환경"],
  },

  // ────────────────────────────────────────────
  // 8. 마케팅 / 판로 개척
  // ────────────────────────────────────────────
  {
    id: "marketing-online-2026",
    name: "온라인 판로 지원사업",
    agency: "중소벤처기업부 / 소상공인시장진흥공단",
    programType: "마케팅",
    amount: { min: 5_000_000, max: 30_000_000 },
    durationMonths: 6,
    eligibility: {
      foundingYearsMax: 7,
      requiresCorporation: true,
      notes: "B2C 제품/서비스 보유",
    },
    description: "쿠팡, 네이버, 11번가 등 온라인 입점 비용 + 광고비 지원.",
    applicationUrl: "https://www.semas.or.kr/",
    applicationFormSections: ["판로 개척 전략", "예상 매출"],
    cohortInfo: { typical: "수시", nextExpected: "수시" },
    bestFor: ["B2C", "이커머스", "D2C"],
  },
  {
    id: "global-marketing-2026",
    name: "수출바우처",
    agency: "산업통상자원부 / KOTRA",
    programType: "글로벌",
    amount: { min: 30_000_000, max: 100_000_000 },
    durationMonths: 12,
    selfBurdenRatio: 0.3,
    eligibility: {
      requiresCorporation: true,
      notes: "전년도 직수출 1만 USD 이상 또는 수출 의지",
    },
    description:
      "해외 마케팅, 인증, 통번역, 박람회 참가 등 13개 분야 바우처로 자유롭게 사용.",
    applicationUrl: "https://www.exportvoucher.com/",
    applicationFormSections: ["수출 계획", "타겟 국가", "사용 항목"],
    cohortInfo: { typical: "매년 1월", nextExpected: "2026-01" },
    bestFor: ["수출", "글로벌"],
  },

  // ────────────────────────────────────────────
  // 9. AI/딥테크 특화
  // ────────────────────────────────────────────
  {
    id: "ai-bachelor-2026",
    name: "AI 바우처",
    agency: "정보통신산업진흥원 (NIPA)",
    programType: "사업화",
    amount: { min: 20_000_000, max: 300_000_000 },
    durationMonths: 12,
    selfBurdenRatio: 0.25,
    eligibility: {
      requiresCorporation: true,
      notes: "AI 솔루션 도입을 원하는 수요기업",
    },
    description:
      "기존 기업의 AI 솔루션 도입 비용 지원. AI 공급기업이 신청 가능 (수요기업 대상).",
    applicationUrl: "https://www.nipa.kr/",
    applicationFormSections: ["AI 도입 효과", "공급기업 매칭"],
    cohortInfo: { typical: "매년 1~3월", nextExpected: "2026-01" },
    bestFor: ["AI 공급기업", "AIaaS"],
  },
];

/**
 * 매칭 점수 계산 (0~100)
 *
 * 가중치:
 * - 기본 적합성 (창업 연차, 산업, 자격) 50점
 * - 금액 효용 30점
 * - 일정 임박도 20점
 */
export function scoreProgram(
  program: GovProgram,
  context: {
    foundingYears?: number;
    age?: number;
    industries?: string[];
    teamSize?: number;
    isCorporation?: boolean;
    targetMarket?: "B2B" | "B2C" | "B2B2C";
    bestForKeywords?: string[]; // 아이디어 분석에서 추출
  }
): { score: number; reasons: string[]; missing: string[] } {
  const reasons: string[] = [];
  const missing: string[] = [];
  let score = 0;
  const elig = program.eligibility;

  // 1. 창업 연차
  if (context.foundingYears !== undefined && elig.foundingYearsMax !== undefined) {
    if (context.foundingYears <= elig.foundingYearsMax &&
        (elig.foundingYearsMin === undefined || context.foundingYears >= elig.foundingYearsMin)) {
      score += 20;
      reasons.push(`창업 ${context.foundingYears}년차 — 자격 충족`);
    } else if (context.foundingYears > elig.foundingYearsMax) {
      missing.push(`창업 ${elig.foundingYearsMax}년 이내 대상 (현재 ${context.foundingYears}년차)`);
    }
  } else if (elig.foundingYearsMax !== undefined) {
    score += 10;
    reasons.push(`창업 ${elig.foundingYearsMax}년 이내 대상`);
  } else {
    score += 15;
  }

  // 2. 나이
  if (context.age !== undefined && elig.ageMax !== undefined) {
    if (context.age <= elig.ageMax && (elig.ageMin === undefined || context.age >= elig.ageMin)) {
      score += 10;
      reasons.push(`만 ${context.age}세 — 청년 자격 충족`);
    } else {
      missing.push(`만 ${elig.ageMax}세 이하 대상`);
    }
  } else {
    score += 5;
  }

  // 3. 산업/키워드 매칭
  const userKeywords = [...(context.industries ?? []), ...(context.bestForKeywords ?? [])]
    .map((s) => s.toLowerCase());
  const programBest = (program.bestFor ?? []).map((s) => s.toLowerCase());
  const overlap = programBest.filter((kw) =>
    userKeywords.some((u) => u.includes(kw) || kw.includes(u))
  );
  if (overlap.length > 0) {
    score += 20;
    reasons.push(`적합 분야: ${overlap.join(", ")}`);
  } else if (programBest.length > 0) {
    score += 5;
  } else {
    score += 10;
  }

  // 4. 법인 요건
  if (elig.requiresCorporation && context.isCorporation === false) {
    missing.push("법인 설립 필요");
  } else if (elig.requiresCorporation === false && context.isCorporation === false) {
    score += 5;
    reasons.push("개인사업자 가능");
  }

  // 5. 금액 효용 (지원금 클수록 가중)
  const maxAmount = program.amount.max;
  if (maxAmount >= 500_000_000) score += 30;
  else if (maxAmount >= 200_000_000) score += 25;
  else if (maxAmount >= 100_000_000) score += 20;
  else if (maxAmount >= 50_000_000) score += 12;
  else score += 5;

  // 6. 임박도
  const next = program.cohortInfo.nextExpected;
  if (next && next !== "수시" && next !== "TBD") {
    const [year, month] = next.split("-").map(Number);
    if (year && month) {
      const target = new Date(year, month - 1);
      const now = new Date();
      const daysUntil = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= 60) {
        score += 20;
        reasons.push(`마감 임박 (약 ${daysUntil}일 남음)`);
      } else if (daysUntil > 60 && daysUntil <= 180) {
        score += 12;
        reasons.push(`준비 가능 (${Math.floor(daysUntil / 30)}개월 후)`);
      } else if (daysUntil > 180) {
        score += 5;
      }
    }
  } else if (next === "수시") {
    score += 15;
    reasons.push("수시 모집 — 언제든 신청 가능");
  }

  return { score: Math.min(100, score), reasons, missing };
}

export function findProgramById(id: string): GovProgram | undefined {
  return GOV_PROGRAMS.find((p) => p.id === id);
}
