/**
 * 워크스페이스 6단계별 큐레이션된 외부 도구·자료 (v1).
 */

export type StageLink = {
  label: string;
  url: string;
  outcome?: string;
  badge?: "정부" | "한국" | "무료" | "추천";
};

export type StageGroup = {
  title: string;
  icon: string;
  description?: string;
  items: StageLink[];
};

export type StageResources = {
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
          { label: "홈택스 — 사업자등록", url: "https://www.hometax.go.kr", outcome: "비대면 30분 → 즉시 사업자", badge: "정부" },
          { label: "토스뱅크 사업자 통장", url: "https://www.tossbank.com", outcome: "비대면 즉시 개설 · 수수료 무료", badge: "한국" },
          { label: "가비아 — 도메인 등록", url: "https://www.gabia.com", outcome: "원하는 .com·.co.kr 즉시 확보", badge: "한국" },
        ],
      },
      {
        title: "회계·세무 도구",
        icon: "📊",
        items: [
          { label: "캐시노트", url: "https://kcd.co.kr/cashnote", outcome: "통장 자동 동기화 · 부가세 신고", badge: "한국" },
          { label: "삼쩜삼", url: "https://3o3.co.kr", outcome: "1인 사업자 종합소득세 자동", badge: "한국" },
        ],
      },
      {
        title: "법무·약관",
        icon: "⚖",
        items: [
          { label: "표준 약관 (공정거래위)", url: "https://www.kca.kr", outcome: "표준 약관 + 자체 수정", badge: "정부" },
          { label: "로톡 — 변호사 컨설팅", url: "https://www.lawtalk.co.kr", outcome: "약관 검토 30분 컨설팅", badge: "한국" },
        ],
      },
    ],
  },

  // ② 팀 빌딩
  2: {
    nextAction: "공동창업자 / 핵심 외주 — 가장 빠른 길",
    groups: [
      {
        title: "팀원 매칭",
        icon: "👥",
        items: [
          { label: "원티드", url: "https://www.wanted.co.kr", outcome: "스타트업 인재 표준 채용", badge: "한국" },
          { label: "로켓펀치", url: "https://www.rocketpunch.com", outcome: "초기 팀원 + 합류 의향자", badge: "한국" },
          { label: "잡플래닛", url: "https://www.jobplanet.co.kr", outcome: "회사 평가 + 인재 풀", badge: "한국" },
        ],
      },
      {
        title: "AC·멘토",
        icon: "🎓",
        items: [
          { label: "스파크랩", url: "https://www.sparklabs.co.kr", outcome: "한국 시드 단계 AC 표준", badge: "한국" },
          { label: "프라이머", url: "https://primer.kr", outcome: "K-pop·SaaS 시드 펀딩", badge: "한국" },
          { label: "더브이씨 (theVC)", url: "https://thevc.kr", outcome: "한국 VC·AC 검색 + 투자이력", badge: "한국" },
        ],
      },
      {
        title: "단기 외주 — 크몽·숨고",
        icon: "🛠",
        items: [
          { label: "크몽", url: "https://kmong.com", outcome: "디자인·번역·영상 등 단기 외주", badge: "한국" },
          { label: "숨고", url: "https://soomgo.com", outcome: "지역 기반 전문가 매칭", badge: "한국" },
          { label: "Upwork", url: "https://www.upwork.com", outcome: "글로벌 프리랜서 풀" },
        ],
      },
    ],
  },

  // ③ 기획·설계
  3: {
    nextAction: "페르소나 + MVP 기능 3개 + 와이어",
    groups: [
      {
        title: "디자인·와이어",
        icon: "🎨",
        items: [
          { label: "Figma", url: "https://www.figma.com", outcome: "와이어 + 하이파이 + 협업 표준", badge: "추천" },
          { label: "Whimsical", url: "https://whimsical.com", outcome: "정렬 신경 안 쓰고 빠른 와이어" },
          { label: "Excalidraw", url: "https://excalidraw.com", outcome: "손그림 톤 — 5분에 한 화면", badge: "무료" },
        ],
      },
      {
        title: "기획·문서",
        icon: "📝",
        items: [
          { label: "Notion", url: "https://www.notion.com", outcome: "PRD·기획서·DB 한 박스", badge: "추천" },
          { label: "Miro", url: "https://miro.com", outcome: "유저 플로우·아이디어 보드" },
        ],
      },
      {
        title: "기술 스택 결정",
        icon: "⚙",
        items: [
          { label: "Next.js + Vercel", url: "https://vercel.com", outcome: "git push 한 번에 글로벌 배포", badge: "추천" },
          { label: "Supabase", url: "https://supabase.com", outcome: "Postgres + Auth + Realtime 한 박스" },
          { label: "Cursor / Claude Code", url: "https://cursor.com", outcome: "AI 페어 프로그래밍", badge: "추천" },
        ],
      },
    ],
  },

  // ④ 개발·빌드
  4: {
    nextAction: "프론트·백엔드·인프라 — 6주 내 베타",
    groups: [
      {
        title: "노코드 / 저코드",
        icon: "🧩",
        items: [
          { label: "Bubble", url: "https://bubble.io", outcome: "복잡한 SaaS도 노코드로" },
          { label: "Glide / Softr", url: "https://www.glideapps.com", outcome: "Sheet + 모바일 앱" },
          { label: "Webflow", url: "https://webflow.com", outcome: "마케팅 사이트 + CMS" },
        ],
      },
      {
        title: "결제·이메일·알림",
        icon: "💳",
        items: [
          { label: "Toss Payments", url: "https://docs.tosspayments.com", outcome: "한국 PG 표준", badge: "한국" },
          { label: "Iamport (포트원)", url: "https://portone.io", outcome: "여러 PG 통합 + 정기결제", badge: "한국" },
          { label: "Resend", url: "https://resend.com", outcome: "개발자 친화 트랜잭셔널 이메일", badge: "추천" },
          { label: "솔라피 — SMS·알림톡", url: "https://www.solapi.com", outcome: "한국 알림톡·SMS API", badge: "한국" },
        ],
      },
      {
        title: "인프라",
        icon: "☁",
        items: [
          { label: "AWS 프리티어", url: "https://aws.amazon.com/free", outcome: "12개월 무료 EC2·RDS" },
          { label: "Cloudflare", url: "https://www.cloudflare.com", outcome: "CDN·DNS·SSL 무료" },
        ],
      },
    ],
  },

  // ⑤ 배포·테스트
  5: {
    nextAction: "베타 5~10명 + 분석 셋업",
    groups: [
      {
        title: "사용자 분석",
        icon: "🔬",
        description: "어떤 화면·기능이 정말 쓰이는지",
        items: [
          { label: "PostHog", url: "https://posthog.com", outcome: "이벤트 + 세션 + A/B 무료 자가 호스팅 OK", badge: "추천" },
          { label: "Mixpanel", url: "https://mixpanel.com", outcome: "퍼널·코호트 — 한국 스타트업 표준" },
          { label: "Amplitude", url: "https://amplitude.com", outcome: "B2C 코호트·리텐션 강함" },
        ],
      },
      {
        title: "에러 모니터링·피드백",
        icon: "🛠",
        items: [
          { label: "Sentry", url: "https://sentry.io", outcome: "프론트·백엔드 에러 자동 추적", badge: "추천" },
          { label: "Microsoft Clarity", url: "https://clarity.microsoft.com", outcome: "마우스 히트맵 + 세션 녹화", badge: "무료" },
          { label: "Canny — 사용자 피드백 보드", url: "https://canny.io", outcome: "베타 사용자가 기능 요청·투표" },
        ],
      },
      {
        title: "베타 모집 채널",
        icon: "🎯",
        items: [
          { label: "디스콰이엇 (DisQuiet)", url: "https://disquiet.io", outcome: "한국 메이커·얼리 어답터", badge: "한국" },
          { label: "Threads / X(Twitter)", url: "https://www.threads.net", outcome: "DM·콜드 메시지로 베타 모집" },
        ],
      },
    ],
  },

  // ⑥ 마케팅·첫 100명
  6: {
    nextAction: "랜딩 + 주력 채널 1개 + 100명",
    groups: [
      {
        title: "랜딩페이지",
        icon: "🌐",
        items: [
          { label: "Carrd", url: "https://carrd.co", outcome: "$19/년 — 가장 빠른 1장 랜딩", badge: "추천" },
          { label: "Framer Sites", url: "https://www.framer.com", outcome: "Figma처럼 디자인 + 즉시 호스팅" },
          { label: "imweb / 식스샵", url: "https://imweb.me", outcome: "한국 호스팅 + 결제 통합", badge: "한국" },
        ],
      },
      {
        title: "주력 채널",
        icon: "📢",
        items: [
          { label: "Meta Ads", url: "https://business.facebook.com", outcome: "1만~5만원 소액 광고로 CTR·CPC" },
          { label: "Google Ads", url: "https://ads.google.com", outcome: "검색 의도 기반 키워드 광고" },
          { label: "네이버 광고", url: "https://searchad.naver.com", outcome: "한국 검색 트래픽 1위", badge: "한국" },
        ],
      },
      {
        title: "정부 지원사업",
        icon: "🏛",
        items: [
          { label: "K-Startup", url: "https://www.k-startup.go.kr", outcome: "예비창업패키지·초기창업패키지", badge: "정부" },
          { label: "TIPS", url: "https://www.jointips.or.kr", outcome: "기술창업 R&D 5억+", badge: "정부" },
        ],
      },
    ],
  },
};
