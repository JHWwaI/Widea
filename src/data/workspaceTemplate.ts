/**
 * 워크스페이스 6단계 + default 체크리스트 (v1).
 *   01. 서류 정비 → 02. 팀 빌딩 → 03. 기획·설계
 *   → 04. 개발·빌드 → 05. 배포·테스트 → 06. 마케팅·첫 100명
 *
 * outsourceRole이 있는 task는 [도움받기] 버튼으로 모집 글 자동 작성 가능.
 */

export type DefaultTask = {
  content: string;
  outsourceRole?: string;
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
      { content: "사업자등록", outsourceRole: "법무·세무사" },
      { content: "사업 통장 분리", outsourceRole: "법무·세무사" },
      { content: "사업계획서 1장 요약" },
      { content: "도메인 + 상표 검색", optional: true },
      { content: "약관·개인정보처리방침", outsourceRole: "법무사·변호사", optional: true },
    ],
  },
  {
    stageNumber: 2,
    name: "팀 빌딩",
    tasks: [
      { content: "공동창업자 결정 (지분율 합의)" },
      { content: "핵심 역할 정의" },
      { content: "팀원 모집글 게시", optional: true },
      { content: "지원자 커피챗", outsourceRole: "팀원 (정직원)", optional: true },
      { content: "첫 영입 결정", optional: true },
      { content: "AC·멘토 컨택", outsourceRole: "AC·멘토", optional: true },
    ],
  },
  {
    stageNumber: 3,
    name: "기획·설계",
    tasks: [
      { content: "타겟 페르소나 1명 정의" },
      { content: "MVP 핵심 기능 3개 결정" },
      { content: "기술 스택 결정" },
      { content: "와이어프레임", outsourceRole: "UX 디자이너", optional: true },
      { content: "DB 스키마 설계", outsourceRole: "백엔드 엔지니어", optional: true },
      { content: "API 스펙", outsourceRole: "백엔드 엔지니어", optional: true },
    ],
  },
  {
    stageNumber: 4,
    name: "개발·빌드",
    tasks: [
      { content: "프론트엔드 빌드", outsourceRole: "프론트엔드 엔지니어" },
      { content: "백엔드 API 빌드", outsourceRole: "백엔드 엔지니어" },
      { content: "인프라 셋업", outsourceRole: "DevOps", optional: true },
      { content: "결제 통합", outsourceRole: "풀스택 엔지니어", optional: true },
      { content: "이메일·SMS 알림", outsourceRole: "풀스택 엔지니어", optional: true },
    ],
  },
  {
    stageNumber: 5,
    name: "배포·테스트",
    tasks: [
      { content: "도메인 + HTTPS" },
      { content: "베타 5~10명 모집", outsourceRole: "베타 테스터" },
      { content: "분석 도구 셋업", outsourceRole: "분석 엔지니어", optional: true },
      { content: "에러 모니터링", optional: true },
      { content: "QA 체크리스트", outsourceRole: "QA 엔지니어", optional: true },
    ],
  },
  {
    stageNumber: 6,
    name: "마케팅·첫 100명",
    tasks: [
      { content: "랜딩페이지 제작", outsourceRole: "랜딩페이지 디자이너" },
      { content: "주력 채널 결정" },
      { content: "첫 100명 전략 실행" },
      { content: "콘텐츠 제작", outsourceRole: "콘텐츠 크리에이터", optional: true },
      { content: "베타 → 정식 전환", optional: true },
      { content: "PR·미디어 노출", outsourceRole: "PR 에이전시", optional: true },
    ],
  },
];
