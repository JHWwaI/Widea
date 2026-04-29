/**
 * 워크스페이스 6단계별 큐레이션된 리소스.
 * "지금 무엇부터?"가 즉각 보이도록 목적별 그룹 + 결과 한 줄 형식.
 */

export type StageLink = {
  label: string;
  url: string;
  /** 클릭 후 결과 (예: "30분 안에 등록 완료") */
  outcome?: string;
  badge?: "정부" | "한국" | "무료" | "추천";
};

export type StageGroup = {
  /** 그룹 제목 (의도 기반: "지금 시작", "돈 받기" 등) */
  title: string;
  /** 그룹 이모지 / 아이콘 */
  icon: string;
  /** 그룹 설명 (선택) */
  description?: string;
  items: StageLink[];
};

export type StageResources = {
  /** 가장 강력한 다음 액션 1줄 (eyebrow에 표시) */
  nextAction?: string;
  groups: StageGroup[];
};

export const STAGE_RESOURCES: Record<number, StageResources> = {
  // ① 서류 정비
  1: {
    nextAction: "사업자등록부터 — 30분이면 끝",
    groups: [
      {
        title: "지금 바로 시작",
        icon: "⚡",
        description: "비대면 · 30분 안에 · 무료",
        items: [
          {
            label: "홈택스 — 사업자등록",
            url: "https://www.hometax.go.kr",
            outcome: "비대면 30분 → 즉시 사업자",
            badge: "정부",
          },
          {
            label: "토스뱅크 사업자 통장",
            url: "https://www.tossbank.com",
            outcome: "비대면 즉시 개설 · 수수료 무료",
            badge: "한국",
          },
          {
            label: "가비아 — 도메인 등록",
            url: "https://www.gabia.com",
            outcome: "원하는 .com·.co.kr 즉시 확보",
            badge: "한국",
          },
        ],
      },
      {
        title: "돈 받기 (정부지원 ~₩500M)",
        icon: "💰",
        description: "한국 초기 창업자의 80%가 활용",
        items: [
          {
            label: "예비창업패키지",
            url: "https://www.k-startup.go.kr",
            outcome: "최대 ₩20M + 1년 멘토링",
            badge: "정부",
          },
          {
            label: "초기창업패키지",
            url: "https://www.k-startup.go.kr",
            outcome: "최대 ₩100M + 사업화 자금",
            badge: "정부",
          },
          {
            label: "TIPS — 민간투자주도형",
            url: "https://www.jointips.or.kr",
            outcome: "최대 ₩500M + 4년 R&D",
            badge: "정부",
          },
        ],
      },
      {
        title: "법적 안전망",
        icon: "🛡",
        items: [
          {
            label: "K-Startup 사업계획서 PSST 양식",
            url: "https://www.k-startup.go.kr/web/contents/biz_pbanc.do",
            outcome: "정부지원 신청 표준 1장",
            badge: "정부",
          },
          {
            label: "특허로 (KIPRIS) — 상표 검색",
            url: "https://www.kipris.or.kr",
            outcome: "이미 누가 등록했는지 5초 확인",
            badge: "정부",
          },
          {
            label: "lawform — 약관·개인정보처리방침",
            url: "https://www.lawform.io/policy",
            outcome: "스타트업용 자동 생성기",
            badge: "한국",
          },
          {
            label: "인터넷등기소 — 법인 등기",
            url: "http://www.iros.go.kr",
            outcome: "법인 설립 비대면 처리",
            badge: "정부",
          },
        ],
      },
    ],
  },

  // ② 팀 빌딩
  2: {
    nextAction: "공동창업자 1명 결정 — 지분 합의 먼저",
    groups: [
      {
        title: "사람 찾기",
        icon: "👥",
        items: [
          {
            label: "원티드 — 스타트업 채용 1위",
            url: "https://www.wanted.co.kr",
            outcome: "공고 등록 → 지원자 자동 추천",
            badge: "한국",
          },
          {
            label: "로켓펀치 — 스타트업 인재 풀",
            url: "https://www.rocketpunch.com",
            outcome: "초기 창업가·메이커 매칭",
            badge: "한국",
          },
          {
            label: "디스콰이엇 — 공동창업자·메이커",
            url: "https://disquiet.io",
            outcome: "1인 메이커끼리 직접 매칭",
            badge: "한국",
          },
          {
            label: "잡코리아 — 직군별 시장 연봉",
            url: "https://www.jobkorea.co.kr",
            outcome: "오퍼 가격 책정 근거 자료",
            badge: "한국",
          },
        ],
      },
      {
        title: "계약·합의 (반드시 서면)",
        icon: "✍",
        description: "지분·근로·NDA — 나중에 다시 못 고침",
        items: [
          {
            label: "공동창업자 지분합의서 (Vesting + Cliff)",
            url: "https://www.lawform.io",
            outcome: "4년 베스팅 · 1년 클리프 표준",
            badge: "한국",
          },
          {
            label: "근로계약서 표준양식 (고용노동부)",
            url: "https://www.moel.go.kr/policy/policydata/list.do",
            outcome: "법적 분쟁 0",
            badge: "정부",
          },
          {
            label: "스톡옵션 약정서",
            url: "https://www.lawform.io",
            outcome: "1% 단위 발행 가능",
            badge: "한국",
          },
          {
            label: "비밀유지계약서 (NDA)",
            url: "https://www.lawform.io",
            outcome: "투자자·외주 대화 전 필수",
            badge: "한국",
          },
        ],
      },
      {
        title: "운영 도구",
        icon: "🛠",
        items: [
          {
            label: "Cal.com — 커피챗 일정 자동",
            url: "https://cal.com",
            outcome: "이메일 핑퐁 0회로 미팅 예약",
            badge: "무료",
          },
          {
            label: "4대보험 정보연계센터",
            url: "https://www.4insure.or.kr",
            outcome: "정직원 1명 = 4대보험 자동 신고",
            badge: "정부",
          },
        ],
      },
    ],
  },

  // ③ 기획·설계
  3: {
    nextAction: "사용자 5명 인터뷰 — 빌드 전에 페인 검증",
    groups: [
      {
        title: "사용자 검증 (Lean Startup 필수)",
        icon: "🎙",
        description: "빌드 전 인터뷰 5명만 해도 망할 일 70% 제거",
        items: [
          {
            label: "Otter.ai — 인터뷰 녹음·자동 전사",
            url: "https://otter.ai",
            outcome: "한국어 정확도 ↑ · 30분 인터뷰 = 1분 요약",
            badge: "추천",
          },
          {
            label: "Jobs-to-be-Done 인터뷰 가이드",
            url: "https://jtbd.info",
            outcome: "고객의 '진짜 사고 싶은 것' 발견",
          },
          {
            label: "Lean Canvas — 1장 사업 모델",
            url: "https://leanstack.com/lean-canvas",
            outcome: "9칸 채우면 사업 전체가 보임",
            badge: "추천",
          },
        ],
      },
      {
        title: "MVP 설계",
        icon: "📐",
        items: [
          {
            label: "MVP 우선순위 (Impact × Effort)",
            url: "https://miro.com/templates/2x2-prioritization-matrix",
            outcome: "기능 30개 → 출시할 3개 결정",
          },
          {
            label: "페르소나 1장 (Notion)",
            url: "https://www.notion.so/templates/user-persona",
            outcome: "타겟 고객 1명을 손에 잡힘",
          },
        ],
      },
      {
        title: "그리기 도구",
        icon: "🎨",
        items: [
          {
            label: "Excalidraw — 손그림 스케치",
            url: "https://excalidraw.com",
            outcome: "5분 만에 와이어프레임 1장",
            badge: "무료",
          },
          {
            label: "Figma — 본격 UI",
            url: "https://figma.com",
            outcome: "협업·프로토타입 표준",
            badge: "무료",
          },
          {
            label: "dbdiagram.io — DB 스키마",
            url: "https://dbdiagram.io",
            outcome: "텍스트로 그리고 SQL 추출",
            badge: "무료",
          },
          {
            label: "StackShare — 다른 회사 기술 스택",
            url: "https://stackshare.io",
            outcome: "Linear·Stripe가 쓰는 스택 즉시 확인",
          },
        ],
      },
    ],
  },

  // ④ 개발·빌드
  4: {
    nextAction: "GitHub + Vercel + Supabase 셋만 있으면 80% 끝",
    groups: [
      {
        title: "1주일 안에 빌드 시작",
        icon: "🚀",
        description: "이 셋이면 무료 + 한 시간 안에 첫 배포",
        items: [
          {
            label: "GitHub — 무료 비공개 저장소",
            url: "https://github.com",
            outcome: "private repo 무제한",
            badge: "무료",
          },
          {
            label: "Vercel — Next.js 자동 배포",
            url: "https://vercel.com",
            outcome: "git push → 30초 후 글로벌 배포",
            badge: "추천",
          },
          {
            label: "Supabase — 인증·DB·Storage",
            url: "https://supabase.com",
            outcome: "Firebase 대안 · Postgres 무료",
            badge: "추천",
          },
          {
            label: "Cloudflare — 도메인·SSL",
            url: "https://cloudflare.com",
            outcome: "도메인 원가 + 무료 HTTPS",
            badge: "무료",
          },
        ],
      },
      {
        title: "한국 결제·알림",
        icon: "💳",
        items: [
          {
            label: "Toss Payments — 결제 통합",
            url: "https://docs.tosspayments.com",
            outcome: "신용카드·간편결제·계좌이체 한 SDK",
            badge: "한국",
          },
          {
            label: "PortOne (구 아임포트)",
            url: "https://portone.io",
            outcome: "여러 PG사 한 번에 통합",
            badge: "한국",
          },
          {
            label: "SOLAPI — SMS·카카오 알림톡",
            url: "https://solapi.com",
            outcome: "건당 8.4원 · 카카오톡 도달률 ↑",
            badge: "한국",
          },
        ],
      },
      {
        title: "이메일·모니터링",
        icon: "🔔",
        items: [
          {
            label: "Resend — 이메일 발송 API",
            url: "https://resend.com",
            outcome: "한국 개발자 표준 · 무료 100/일",
            badge: "추천",
          },
          {
            label: "Sentry — 에러 모니터링",
            url: "https://sentry.io",
            outcome: "프로덕션 에러 실시간 알림",
            badge: "무료",
          },
        ],
      },
    ],
  },

  // ⑤ 배포·테스트
  5: {
    nextAction: "PostHog 한 개 깔면 분석·녹화·A/B 다 됨",
    groups: [
      {
        title: "사용자가 진짜 어떻게 쓰는지",
        icon: "🔍",
        description: "안 깔면 100% 추측으로 운영함",
        items: [
          {
            label: "PostHog — 분석+녹화+A/B 한 곳",
            url: "https://posthog.com",
            outcome: "오픈소스 · 무료 1M 이벤트/월",
            badge: "추천",
          },
          {
            label: "Microsoft Clarity — 사용자 화면 녹화",
            url: "https://clarity.microsoft.com",
            outcome: "Hotjar 무료 대안 · 무제한 세션",
            badge: "무료",
          },
          {
            label: "Google Analytics 4",
            url: "https://analytics.google.com",
            outcome: "유입 채널 분석 표준",
            badge: "무료",
          },
        ],
      },
      {
        title: "베타 테스터·피드백",
        icon: "💬",
        items: [
          {
            label: "디스콰이엇 — 한국 메이커 풀에 출시 알림",
            url: "https://disquiet.io",
            outcome: "관심 메이커 100명 → 첫 사용자",
            badge: "한국",
          },
          {
            label: "Product Hunt — 글로벌 출시",
            url: "https://producthunt.com",
            outcome: "화요일 0시 KST 출시 권장",
          },
          {
            label: "Canny — 사용자 피드백·투표",
            url: "https://canny.io",
            outcome: "기능 요청 우선순위 투표",
            badge: "무료",
          },
          {
            label: "BetaList — 글로벌 베타",
            url: "https://betalist.com",
            outcome: "영문 베타 사용자 풀",
          },
        ],
      },
    ],
  },

  // ⑥ 마케팅·첫 100명
  6: {
    nextAction: "Framer로 랜딩 + Stibee로 이메일 = 첫 100명",
    groups: [
      {
        title: "랜딩페이지 30분 안에",
        icon: "🌐",
        items: [
          {
            label: "Framer — 코드 없이 랜딩",
            url: "https://framer.com",
            outcome: "디자인+호스팅+SEO 한 번에",
            badge: "추천",
          },
          {
            label: "Carrd — 1페이지 (월 $9)",
            url: "https://carrd.co",
            outcome: "MVP 랜딩 30분",
            badge: "무료",
          },
        ],
      },
      {
        title: "콘텐츠 만들기",
        icon: "🎬",
        items: [
          {
            label: "Canva — 인스타·블로그 이미지",
            url: "https://www.canva.com",
            outcome: "디자이너 없이 이미지 5분",
            badge: "무료",
          },
          {
            label: "CapCut — 영상 편집",
            url: "https://www.capcut.com",
            outcome: "릴스·쇼츠 모바일에서 5분",
            badge: "무료",
          },
          {
            label: "눈누 — 한국어 무료 폰트",
            url: "https://noonnu.cc",
            outcome: "상업용 무료 폰트 100+",
            badge: "한국",
          },
          {
            label: "Unsplash — 무료 사진",
            url: "https://unsplash.com",
            outcome: "고화질 무료 · 출처 표기 X",
            badge: "무료",
          },
        ],
      },
      {
        title: "한국 채널 (도달률 1순위)",
        icon: "🇰🇷",
        items: [
          {
            label: "카카오모먼트 — 카톡 광고",
            url: "https://moment.kakao.com",
            outcome: "한국인 95% 도달",
            badge: "한국",
          },
          {
            label: "네이버 검색광고",
            url: "https://searchad.naver.com",
            outcome: "구매 직전 검색 트래픽",
            badge: "한국",
          },
          {
            label: "Stibee — 한국형 이메일 마케팅",
            url: "https://stibee.com",
            outcome: "네이버·카카오 도달률 ↑",
            badge: "한국",
          },
          {
            label: "디스콰이엇 — 메이커 커뮤니티",
            url: "https://disquiet.io",
            outcome: "초기 사용자·피드백 동시",
            badge: "한국",
          },
        ],
      },
      {
        title: "글로벌 채널",
        icon: "🌍",
        items: [
          {
            label: "Meta Business Suite — 인스타·페북",
            url: "https://business.facebook.com",
            outcome: "타겟팅 정밀도 1위",
          },
          {
            label: "Google Ads — 검색 광고",
            url: "https://ads.google.com",
            outcome: "구매 의도 키워드 잡기",
          },
          {
            label: "Beehiiv — 글로벌 뉴스레터",
            url: "https://beehiiv.com",
            outcome: "영문 사용자 + 수익화 통합",
          },
        ],
      },
    ],
  },
};
