/**
 * 워크스페이스 6단계 + default 체크리스트.
 * 대표 아이디어 선정 시 이 템플릿으로 WorkspaceStage + WorkspaceTask가 자동 생성된다.
 *
 * - core 15개: 첫 사용자 검증·런칭에 꼭 필요한 task
 * - optional 18개: 상황에 따라 선택 (orderIndex가 100+로 저장되어 프론트에서 "선택" 배지로 표시)
 * outsourceRole이 있는 task는 사용자가 [🤝 도움받기] 버튼을 누를 수 있다.
 */

export type DefaultTask = {
  /** task 본문 */
  content: string;
  /** 외주 가능 시 역할 (예: "변호사·세무사", "풀스택 엔지니어") */
  outsourceRole?: string;
  /** 선택 task: 상황에 따라 건너뛸 수 있음. progress 계산에서 제외. */
  optional?: boolean;
};

export type StageTemplate = {
  stageNumber: number;
  name: string;
  tasks: DefaultTask[];
};

export const WORKSPACE_TEMPLATE: StageTemplate[] = [
  {
    stageNumber: 1,
    name: "서류 정비",
    tasks: [
      { content: "사업자등록 (개인사업자 또는 법인)", outsourceRole: "법무·세무사" },
      { content: "법인 / 사업 통장 분리", outsourceRole: "법무·세무사" },
      { content: "사업계획서 1장 요약 (K-Startup·TIPS 신청용)" },
      { content: "도메인 등록 + 상표 검색", optional: true },
      { content: "약관 · 개인정보처리방침 (서비스 시작 시점)", outsourceRole: "법무사·변호사", optional: true },
    ],
  },
  {
    stageNumber: 2,
    name: "팀 빌딩",
    tasks: [
      { content: "공동창업자 결정 (1~2명, 지분율 합의)" },
      { content: "핵심 역할 정의 (개발 · 디자인 · 마케팅)" },
      { content: "팀원 모집글 게시", optional: true },
      { content: "지원자 검토 + 커피챗 일정", outsourceRole: "팀원 (정직원)", optional: true },
      { content: "첫 영입 결정", optional: true },
      { content: "AC / 멘토 컨택", outsourceRole: "AC·멘토", optional: true },
    ],
  },
  {
    stageNumber: 3,
    name: "기획 · 설계",
    tasks: [
      { content: "타겟 고객 페르소나 1명 정의" },
      { content: "MVP 핵심 기능 3개 결정 (deep-report 인용)" },
      { content: "기술 스택 결정 (deep-report tech_stack 참고)" },
      { content: "와이어프레임 (Figma 또는 종이)", outsourceRole: "UX 디자이너", optional: true },
      { content: "DB 스키마 설계", outsourceRole: "백엔드 엔지니어", optional: true },
      { content: "API 스펙 (필요 시)", outsourceRole: "백엔드 엔지니어", optional: true },
    ],
  },
  {
    stageNumber: 4,
    name: "개발 · 빌드",
    tasks: [
      { content: "프론트엔드 빌드", outsourceRole: "프론트엔드 엔지니어" },
      { content: "백엔드 API 빌드", outsourceRole: "백엔드 엔지니어" },
      { content: "인프라 셋업 (도메인 · 서버 · DB)", outsourceRole: "DevOps", optional: true },
      { content: "결제 통합 (Toss / Iamport)", outsourceRole: "풀스택 엔지니어", optional: true },
      { content: "이메일 · SMS 알림 통합", outsourceRole: "풀스택 엔지니어", optional: true },
    ],
  },
  {
    stageNumber: 5,
    name: "배포 · 테스트",
    tasks: [
      { content: "도메인 + HTTPS / SSL" },
      { content: "베타 테스터 5~10명 모집", outsourceRole: "베타 테스터" },
      { content: "분석 도구 (Mixpanel · Amplitude · GA4)", outsourceRole: "분석 엔지니어", optional: true },
      { content: "에러 모니터링 (Sentry)", optional: true },
      { content: "QA 체크리스트", outsourceRole: "QA 엔지니어", optional: true },
    ],
  },
  {
    stageNumber: 6,
    name: "마케팅 · 첫 100명",
    tasks: [
      { content: "랜딩페이지 제작", outsourceRole: "랜딩페이지 디자이너" },
      { content: "주력 채널 결정 (인스타 · 유튜브 · 스레드 · 페이스북)" },
      { content: "첫 100명 전략 실행 (deep-report 송곳 전략 한국화)" },
      { content: "콘텐츠 (블로그 · 영상 · 인스타)", outsourceRole: "콘텐츠 크리에이터", optional: true },
      { content: "베타 → 정식 전환", optional: true },
      { content: "PR / 미디어 노출", outsourceRole: "PR 에이전시", optional: true },
    ],
  },
];
