/**
 * 데모용 시드: 전문가 프로필 + 커뮤니티 글 채우기.
 * 실행: npm run seed:marketplace
 *
 * 동작:
 *   1) 가짜 사용자 12명 생성 (없으면)
 *   2) 각 사용자에 ExpertProfile 생성
 *   3) 카테고리별 커뮤니티 글 9개 생성
 */

import "dotenv/config";
import { PrismaClient, ExpertCategory, PostCategory } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

type ExpertSeed = {
  email: string;
  name: string;
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string;
};

const EXPERTS: ExpertSeed[] = [
  {
    email: "kim.dev@example.com",
    name: "김민준",
    category: "DEVELOPER",
    headline: "React·Next.js 풀스택 6년차, 핀테크/B2B SaaS 경험",
    bio: "토스·뱅크샐러드 등 핀테크에서 5년, 이후 SaaS 스타트업 CTO로 1년. 0→1 MVP 빌딩과 결제·인증 통합에 강합니다. TypeScript 강한 타이핑·테스트 커버리지 우선.",
    skills: ["React", "Next.js", "TypeScript", "PostgreSQL", "Prisma", "Toss Payments"],
    hourlyRateMin: 80000,
    hourlyRateMax: 130000,
    links: [
      { label: "GitHub", url: "https://github.com/example-kim" },
      { label: "포트폴리오", url: "https://kim.dev" },
    ],
    location: "서울 (원격 가능)",
  },
  {
    email: "park.designer@example.com",
    name: "박지영",
    category: "DESIGNER",
    headline: "B2C 모바일 UX 디자이너, Figma·Framer 능숙",
    bio: "당근·오늘의집 인턴 후 프리랜서 4년차. 한국 사용자 정서에 맞춘 다크·미니멀 톤이 강점. 와이어프레임 → 프로토타입 → 디자인 시스템까지 한 번에.",
    skills: ["Figma", "Framer", "Webflow", "디자인 시스템", "UX 리서치"],
    hourlyRateMin: 60000,
    hourlyRateMax: 90000,
    links: [
      { label: "Behance", url: "https://www.behance.net/example-park" },
      { label: "Dribbble", url: "https://dribbble.com/example-park" },
    ],
    location: "서울",
  },
  {
    email: "lee.backend@example.com",
    name: "이준혁",
    category: "DEVELOPER",
    headline: "Node·Python 백엔드 + AWS DevOps, 결제·웹훅 전문",
    bio: "토스페이먼츠·아임포트 통합 12회 이상. 결제 웹훅·환불·정산 로직 안정화 경험. AWS Lambda·SQS·RDS로 확장 가능한 아키텍처 설계.",
    skills: ["Node.js", "Python", "AWS", "PostgreSQL", "Redis", "결제 통합"],
    hourlyRateMin: 90000,
    hourlyRateMax: 150000,
    links: [{ label: "GitHub", url: "https://github.com/example-lee" }],
    location: "원격",
  },
  {
    email: "choi.marketing@example.com",
    name: "최서연",
    category: "MARKETER",
    headline: "퍼포먼스 마케터 5년차, B2C 그로스 해킹",
    bio: "메타·구글 광고 운영 + GA4·Mixpanel 분석. 첫 100명·첫 1000명 단계의 그로스 실험 설계 경험 다수. 인스타그램·유튜브 콘텐츠 전략까지.",
    skills: ["Meta Ads", "Google Ads", "GA4", "Mixpanel", "콘텐츠 마케팅"],
    hourlyRateMin: 50000,
    hourlyRateMax: 80000,
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-choi" }],
    location: "서울",
  },
  {
    email: "jung.ac@example.com",
    name: "정현우",
    category: "AC_MENTOR",
    headline: "전 시리즈A 창업자 → 액셀러레이터 파트너",
    bio: "B2C 모바일 스타트업 시리즈A 100억 유치 후 매각. 현재 액셀러레이터에서 시드~프리A 단계 창업가 멘토링 진행. IR 덱·재무모델·KPI 설계 강점.",
    skills: ["IR 컨설팅", "재무모델링", "KPI 설계", "투자 유치"],
    hourlyRateMin: null,
    hourlyRateMax: null,
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-jung" }],
    location: "서울",
  },
  {
    email: "han.planner@example.com",
    name: "한지민",
    category: "PLANNER",
    headline: "B2C 서비스 기획자 7년차, 페르소나·MVP 정의",
    bio: "토스·당근에서 서비스 기획자로 7년. 사용자 인터뷰 → 페르소나 → MVP 기능 우선순위 워크숍 진행. 프리랜서 기획 14건 완료.",
    skills: ["서비스 기획", "사용자 리서치", "MVP 정의", "Figma 와이어프레임"],
    hourlyRateMin: 70000,
    hourlyRateMax: 100000,
    links: [{ label: "Notion 포트폴리오", url: "https://example.notion.site/han" }],
    location: "서울 (하이브리드)",
  },
  {
    email: "yoo.flutter@example.com",
    name: "유서진",
    category: "DEVELOPER",
    headline: "Flutter·React Native 모바일 풀스택, 앱스토어 8개 출시",
    bio: "iOS·Android 동시 출시 경험 8회. Flutter 4년·RN 3년. 푸시 알림·인앱결제·소셜로그인까지 한 번에 셋업. 디자이너와의 협업 빠릅니다.",
    skills: ["Flutter", "React Native", "Dart", "Firebase", "App Store Connect"],
    hourlyRateMin: 70000,
    hourlyRateMax: 110000,
    links: [{ label: "GitHub", url: "https://github.com/example-yoo" }],
    location: "원격",
  },
  {
    email: "song.brand@example.com",
    name: "송하늘",
    category: "DESIGNER",
    headline: "브랜드 디자이너 + 모션그래픽, 스타트업 50개 BI 작업",
    bio: "스타트업 BI·로고·키 비주얼 50개 이상. 미니멀·타이포 중심. After Effects 모션 영상 추가 가능 (런칭 영상 등).",
    skills: ["브랜드 아이덴티티", "로고", "Figma", "Adobe Illustrator", "After Effects"],
    hourlyRateMin: 60000,
    hourlyRateMax: 100000,
    links: [{ label: "Behance", url: "https://www.behance.net/example-song" }],
    location: "서울",
  },
  {
    email: "kang.pm@example.com",
    name: "강도현",
    category: "PM",
    headline: "PM 8년차 (시리즈B 핀테크 + B2B SaaS)",
    bio: "프로덕트 PM 8년. 로드맵 설계·분기 OKR·디자인-개발 인터페이스 정리에 강합니다. 시리즈B 핀테크에서 ARR 0→30억 성장에 기여.",
    skills: ["로드맵 설계", "OKR", "Linear", "Notion", "사용자 분석"],
    hourlyRateMin: 90000,
    hourlyRateMax: 150000,
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-kang" }],
    location: "서울",
  },
  {
    email: "noh.content@example.com",
    name: "노유진",
    category: "MARKETER",
    headline: "콘텐츠 마케터 + 카피라이터, 브랜드 톤매뉴얼 작성",
    bio: "스타트업 4곳에서 콘텐츠 헤드. 인스타·블로그·뉴스레터 운영. 브랜드 톤매뉴얼 작성 경험 12건. SEO 키워드 리서치도 진행.",
    skills: ["콘텐츠 마케팅", "카피라이팅", "SEO", "뉴스레터", "브랜드 톤"],
    hourlyRateMin: 40000,
    hourlyRateMax: 70000,
    links: [{ label: "포트폴리오", url: "https://noh.studio" }],
    location: "원격",
  },
  {
    email: "im.devops@example.com",
    name: "임재훈",
    category: "DEVELOPER",
    headline: "DevOps + SRE, AWS·GCP·k8s 인프라 셋업",
    bio: "스타트업 인프라 셋업 30건. CI/CD·모니터링·보안 한 번에 구축. 비용 최적화로 30~50% 절감 사례 다수. 야근 줄이는 자동화 강점.",
    skills: ["AWS", "GCP", "Kubernetes", "Terraform", "GitHub Actions", "Sentry"],
    hourlyRateMin: 100000,
    hourlyRateMax: 160000,
    links: [{ label: "GitHub", url: "https://github.com/example-im" }],
    location: "원격",
  },
  {
    email: "moon.mentor@example.com",
    name: "문수아",
    category: "AC_MENTOR",
    headline: "여성 창업가 멘토 + 정부지원사업 컨설팅",
    bio: "여성기업종합지원센터 출신, 예비창업패키지·초기창업패키지 컨설팅 100건+. 사업계획서 작성·프레젠테이션 코칭 강점.",
    skills: ["사업계획서", "정부지원사업", "프레젠테이션 코칭", "여성창업"],
    hourlyRateMin: null,
    hourlyRateMax: null,
    links: [{ label: "K-Startup", url: "https://www.k-startup.go.kr" }],
    location: "서울 + 원격",
  },
];

type PostSeed = {
  authorEmail: string;
  category: PostCategory;
  title: string;
  content: string;
};

const POSTS: PostSeed[] = [
  {
    authorEmail: "kim.dev@example.com",
    category: "TEAM_RECRUIT",
    title: "[B2B SaaS] 풀스택 공동창업자 1명 모집 (시드 직전)",
    content: `안녕하세요. AI 기반 회의록 자동화 SaaS를 개발 중입니다.\n\n**현재 단계**\n- MVP 60% 완성, 베타 테스터 12명\n- 시드 라운드 4월 말 마감 예정\n\n**찾는 분**\n- React/Next.js 또는 Node 백엔드 3년 이상\n- 0→1 단계의 chaos를 즐기는 분\n- 지분 협의 가능 (5~15%)\n\n관심 있으시면 댓글 또는 DM 부탁드립니다.`,
  },
  {
    authorEmail: "park.designer@example.com",
    category: "OUTSOURCE_REQUEST",
    title: "[2주] 모바일 앱 메인 화면 4장 디자인 외주",
    content: `iOS/Android 앱 출시 직전이라 메인 4개 화면 (홈·검색·상세·마이페이지) 디자인이 필요합니다.\n\n- 다크 모드 우선\n- Figma 파일 + 컴포넌트 정리\n- 예산 200~300만원\n- 일정: 2주\n\n포트폴리오 링크 첨부해주시면 24시간 내 회신.`,
  },
  {
    authorEmail: "jung.ac@example.com",
    category: "AC_REQUEST",
    title: "[시드 준비] IR 덱 리뷰 + 투자자 매칭 도와주실 AC 찾습니다",
    content: `시드 라운드 준비 중인 핀테크 스타트업입니다.\n\n**현재 상태**\n- MAU 8000, ARR 추정 1억\n- IR 덱 v3 작성 완료\n\n**원하는 도움**\n- 덱 1차 리뷰 (구조·논리·수치)\n- 시드 단계 투자자 5~10명 소개\n- 약 6주 단기 컨설팅\n\n비용·계약 형태 모두 협의 가능합니다.`,
  },
  {
    authorEmail: "han.planner@example.com",
    category: "QUESTION",
    title: "MVP 기능 우선순위 결정, 어떻게 하셨나요?",
    content: `초기 단계에서 \"이거 다 만들어야 하나?\" 하는 기능이 30개 정도 나왔는데, 어떤 기준으로 5~7개로 줄이셨는지 궁금합니다.\n\n현재 사용자 인터뷰 12명 진행했고, MoSCoW로 분류 시도 중이긴 한데 객관적이지 않은 느낌이 있어서요.`,
  },
  {
    authorEmail: "lee.backend@example.com",
    category: "CASE_STUDY",
    title: "토스페이먼츠 웹훅, 실패 케이스 정리 (재시도·중복 처리)",
    content: `결제 통합하면서 만났던 토스 웹훅 이슈를 정리했습니다.\n\n1. 재시도가 최대 5회 들어옴 → 멱등성 키 필수\n2. 환불 시 결제 키와 매칭 → DB에 결제 키 인덱스\n3. 중복 처리 → \`SELECT FOR UPDATE\` + 트랜잭션\n\n자세한 코드는 댓글로 공유드릴게요.`,
  },
  {
    authorEmail: "yoo.flutter@example.com",
    category: "TEAM_RECRUIT",
    title: "[헬스케어] iOS 앱 개발자 1명 (Flutter 가능자 우대)",
    content: `여성 건강 트래킹 앱입니다.\n\n- 현재 안드로이드 출시, iOS 빌드 필요\n- Flutter면 좋고, RN/Swift 가능자도 환영\n- 풀타임 가능 (월 600~800), 또는 프리랜서 2개월\n\n팀: 개발 1·디자이너 1·기획 1 (모두 풀타임)`,
  },
  {
    authorEmail: "noh.content@example.com",
    category: "FREE_TALK",
    title: "한국 스타트업 뉴스레터 추천 받아요 (그로스·창업)",
    content: `오프라인 행사 가기 힘들어서 뉴스레터로만 정보 받고 있는데, 추천 부탁드립니다.\n\n저는 현재 구독 중:\n- 패스트벤처스 \"오티움\"\n- 8VC \"Daily\"\n- Lenny's Newsletter (영어)\n\n한국어로 그로스·B2B 다루는 거 더 있을까요?`,
  },
  {
    authorEmail: "moon.mentor@example.com",
    category: "AC_REQUEST",
    title: "[정부지원] 예비창업패키지 사업계획서 1차 검토 가능",
    content: `예비창업패키지 4월 모집 시작했습니다. 100건 이상 검토 경험 있고, 무료로 1차 review 5명 진행할게요.\n\n조건:\n- 4/15 이전 작성 완료된 초안\n- 5월 중순까지 PDF 회신\n- 댓글 또는 DM으로 신청\n\n선착순 5명 마감.`,
  },
  {
    authorEmail: "kang.pm@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] B2B 영업 자동화, 한국 시장에서 가능할까?",
    content: `Apollo.io·HubSpot 같은 영업 자동화가 한국에선 잘 안 되는 이유를 정리해봤습니다.\n\n1. CRM 사용률 자체가 낮음\n2. \"카톡으로 보내주세요\" 문화\n3. 데이터 출처가 흩어져 있음 (사람인·잡코리아 등)\n\n이거 풀어주는 한국형 솔루션 있으면 보고 싶어요. 다들 어떻게 영업하시나요?`,
  },

  // ── 아이디어 공유 (IDEA_SHARE) ────────────────────────
  {
    authorEmail: "han.planner@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 1인 변호사 사무실용 AI 사건요약 SaaS",
    content: `로톡·로앤굿이 안 풀어준 영역. 1인 변호사 사무실 7곳 인터뷰 결과:\n\n- 평균 사건 한 건당 의뢰인 진술서 30~80장 정독\n- 핵심 쟁점 추리는데 2~4시간\n- 비서 없이 혼자 다 처리\n\n진술서 PDF 업로드 → 사건 요약·쟁점·증거 매칭 자동 생성. 월 5만원 정도면 즉시 결제할 시장이라고 봅니다.\n\nAI 윤리·개인정보 이슈만 풀면 한국 변호사 1만 5천 명이 잠재 시장.`,
  },
  {
    authorEmail: "noh.content@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 인스타 릴스 기반 한국형 \"숏폼 레시피 마켓\"",
    content: `만개의레시피·해먹남녀가 글 기반인데, MZ는 텍스트 안 읽음.\n\n착안:\n- 인스타 릴스로 1분 레시피 찍는 홈쿡 크리에이터 폭증\n- 광고 수익 외엔 수익 X\n- 시청자도 \"재료 어디서 사지\" 매번 검색\n\n제안: 릴스 → 재료 자동 태깅 → 마켓컬리·SSG 즉시 장보기 + 크리에이터 수수료 셰어. 거래 수수료 7~10%.`,
  },
  {
    authorEmail: "yoo.flutter@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 자영업자용 \"리뷰 응답 자동화\" 카카오 채널 봇",
    content: `네이버 플레이스 리뷰 응답이 사장님들에게 가장 큰 부담.\n\n- 리뷰 1건당 평균 응답 작성 5~7분\n- 부정 리뷰 응답이 가게 평점에 큰 영향\n- 외주 맡기기엔 톤이 안 맞음\n\nGPT로 사장님 가게 톤·맥락 학습 → 카톡으로 \"이렇게 답할까요?\" 제안. 월 1.9만원, 자영업자 50만 명이 잠재.`,
  },
  {
    authorEmail: "moon.mentor@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 정부지원사업 자동 매칭 + 신청서 초안 AI",
    content: `예비·초기·재도약 등 K-Startup 사업만 200개 넘는데 본인에게 맞는 게 뭔지 모름.\n\n시도 가치 있는 구조:\n1. 사업자정보·업종·매출 입력 → 자격 매칭 자동\n2. 마감일·접수처·필수서류 알림\n3. 합격한 과거 사업계획서 RAG → 초안 작성\n\n작년 250조 정부지원사업 시장에서 1%만 잡아도 의미 있음.`,
  },

  // ── 질문 (QUESTION) ─────────────────────────────────
  {
    authorEmail: "kim.dev@example.com",
    category: "QUESTION",
    title: "솔로 창업 시작하기 전 6개월 동안 뭘 했어야 후회 없을까요?",
    content: `다음 달부터 솔로로 사업 시작합니다 (B2C SaaS). 지난 회사 퇴사 6개월 전 \"이거 미리 했으면 좋았을 텐데\" 하는 거 있으면 공유 부탁드립니다.\n\n저는 일단:\n- 예금 12개월치 모음\n- 기술 스택 결정 (Next.js + Supabase)\n- 공동창업자 후보 2명과 사전 대화\n\n빼먹은 거 있을까요?`,
  },
  {
    authorEmail: "park.designer@example.com",
    category: "QUESTION",
    title: "디자이너 → 창업가 전환, 기술 학습 어디부터 시작?",
    content: `Figma 5년차 디자이너입니다. AI로 \"내가 디자인한 화면 → 실제 코드\" 변환 도구가 많아져서 1인 창업 가능성이 높아 보입니다.\n\n- HTML/CSS만 조금 아는 수준\n- 백엔드는 전혀\n- v0·Cursor·Lovable 등 시도해봤는데 결국 어딘가는 막힘\n\n어디까지 직접 배우고 어디부터 외주 맡기는 게 합리적일까요?`,
  },
  {
    authorEmail: "kang.pm@example.com",
    category: "QUESTION",
    title: "공동창업자 지분 협의, 첫 미팅에서 어디까지 정해야 하나요?",
    content: `다음 주 공동창업자 후보와 첫 미팅입니다. 친한 사이인데 비즈니스 얘기는 처음이라 어색할 것 같은데, 첫 미팅에서:\n\n1. 지분 비율\n2. Vesting (4년 1 cliff?)\n3. 의사결정 권한\n4. 이탈 시 처리\n\n어디까지 첫 미팅에서 정하고, 어디부터 변호사 끼고 정식화하나요?`,
  },
  {
    authorEmail: "lee.backend@example.com",
    category: "QUESTION",
    title: "[기술] Supabase vs Firebase vs 자체 Postgres, 0→1 단계 추천?",
    content: `처음 제대로 백엔드 결정하려는데 셋 다 trade-off가 있어서 고민입니다.\n\n현재 상황:\n- 예상 사용자 첫 6개월 1000명 이하\n- 결제·인증·실시간 알림 필요\n- 개발자 1명 (저)\n\nSupabase(PG + 실시간)·Firebase(NoSQL)·자체 호스팅(EC2 + Postgres) 중 뭘 쓰셨나요?`,
  },
  {
    authorEmail: "im.devops@example.com",
    category: "QUESTION",
    title: "[법무] 1인 사업자 → 법인 전환 타이밍",
    content: `현재 1인 개인사업자. 매출 월 800만원 수준입니다. 법인 전환 시점 고민:\n\n- 세무사 의견은 \"매출 1억 넘으면 무조건\"\n- 다만 법인 전환 시 자산 이전·계약 재체결·통장 분리 등 비용 1000만원+\n- 외부 투자 받을 가능성 있다면 빨리 법인이 나음\n\n비슷한 단계에서 어떻게 결정하셨나요?`,
  },

  // ── 케이스 스터디 (CASE_STUDY) ────────────────────────
  {
    authorEmail: "noh.content@example.com",
    category: "CASE_STUDY",
    title: "[그로스] 인스타 광고 ROAS 800% 달성한 콘텐츠 패턴 5가지",
    content: `B2C 식품 브랜드 4개월 운영 결과, ROAS 800%(평균 200%)를 만든 광고 패턴 정리.\n\n1. \"고객 후기 + 자막\" 구조 — UGC 가공 형태\n2. 첫 1초에 \"가격 강조\" (29,000원이 이렇게)\n3. 칼라 대비 강한 사진 (배경 흰색 → 제품 색)\n4. 댓글 영역에 가격·구매 링크 댓글로 추가 (CTR ↑)\n5. CTA 버튼 \"지금 사기\" 대신 \"오늘 도착\"\n\n광고비 예산·소재 길이별 비교는 댓글로.`,
  },
  {
    authorEmail: "lee.backend@example.com",
    category: "CASE_STUDY",
    title: "[기술] AWS 비용 80% 절감한 4가지 변경 (월 320만 → 65만)",
    content: `시리즈A 직전 비용 압박 + AWS 청구서 충격.\n\n변경:\n1. RDS db.t3.large → t4g.medium (Graviton) — 35% 절감\n2. ALB 한 개 + Path-based routing으로 통합 (서비스 4개 → 1개)\n3. CloudWatch 로그 90일 → 14일 보관, 이후 S3 Glacier\n4. NAT Gateway 시간당 → VPC Endpoint로 교체 (S3·DynamoDB)\n\n결과: 월 320만 → 65만. 성능 영향 거의 없음.`,
  },
  {
    authorEmail: "park.designer@example.com",
    category: "CASE_STUDY",
    title: "[UX] 결제 화면 1단계 줄여서 전환율 14% → 22%",
    content: `B2C 모바일 앱 결제 흐름 개선.\n\n기존 (4단계): 장바구니 → 배송지 → 결제수단 → 확인\n\n개선 (3단계): 장바구니에 배송지·결제수단 인라인 → 확인\n\n추가 적용:\n- 배송지 \"기본 배송지\" 자동 선택 (변경 시에만 노출)\n- 결제수단 마지막 사용 자동 선택\n- \"결제하기\" 버튼이 always sticky bottom\n\n결과: 14% → 22% 전환율, 평균 결제 시간 92초 → 38초.`,
  },
  {
    authorEmail: "choi.marketing@example.com",
    category: "CASE_STUDY",
    title: "[리텐션] 첫 100명 → 1000명 단계의 retention 5가지 레버",
    content: `B2C SaaS 첫 1000명 모으는 동안 시도한 레버 정리. D7 retention 12% → 38%.\n\n1. **Onboarding 1분 demo** — 가입 직후 영상 1분 (skip 가능)\n2. **첫 액션 트리거** — \"첫 프로젝트 만들기\"를 가입 즉시 권유\n3. **3일째 자동 이메일** — 활용 못한 기능 1개 강조\n4. **\"지금 함께 사용 중\" 활성 사용자 카운트** — 사회적 증거\n5. **친구 초대 시 양쪽 보너스** — 50% off vs 무료 1개월 비교했더니 후자가 압승\n\n5번이 가장 큰 효과 (가입 30% 추가 발생).`,
  },

  // ── 자유 토크 (FREE_TALK) ────────────────────────────
  {
    authorEmail: "han.planner@example.com",
    category: "FREE_TALK",
    title: "솔로 창업 4개월차, 가장 외로운 순간은?",
    content: `4개월 전 회사 그만두고 솔로 창업 시작했는데, 외로움이 생각보다 크네요.\n\n가장 힘든 순간:\n- 결정해줄 사람이 아무도 없을 때 (모든 디테일을 혼자 판단)\n- 친구들이 \"잘 되어가?\" 물어볼 때 답하기 애매할 때\n- 새벽 3시에 \"내가 지금 뭐하고 있나\" 싶은 순간\n\n다들 어떻게 외로움 관리하시나요?`,
  },
  {
    authorEmail: "kang.pm@example.com",
    category: "FREE_TALK",
    title: "스타트업 사람들 책상 위에 뭐 있나요?",
    content: `심심해서 올려봅니다. 다들 책상 위에 뭐 있는지 궁금합니다.\n\n저는:\n- 스탠딩 데스크 (FlexiSpot)\n- 모니터 2개 (LG 27 + 32)\n- 로지텍 MX Master 3S\n- HHKB Pro 2\n- 1Password 키 (USB-C)\n- 멘탈 관리용 작은 화분 (산세베리아)\n\n사진 댓글로 부탁해요.`,
  },
  {
    authorEmail: "yoo.flutter@example.com",
    category: "FREE_TALK",
    title: "성수동 vs 강남 vs 판교, 창업가 모임 어디가 좋아요?",
    content: `네트워킹 모임 위치 결정 중입니다.\n\n- 성수: 트렌디·콘텐츠/디자인 많음, 주차 X\n- 강남: 핀테크·B2B 많음, 모임 장소 비쌈\n- 판교: 시리즈B+ 많음, 거리상 멀음\n\n다들 어디서 모이세요? 추천할 만한 정기 모임이나 공간 있으면 알려주세요.`,
  },
  {
    authorEmail: "im.devops@example.com",
    category: "FREE_TALK",
    title: "Cursor vs Windsurf vs Claude Code, 진짜 생산성 차이 있나요?",
    content: `Cursor 1년 쓰다가 Windsurf로 갈아탔는데 Claude Code 출시되고 다시 고민됩니다.\n\n각자 강점:\n- Cursor: UI 익숙·shortcut 많음\n- Windsurf: Cascade가 똑똑하긴 함\n- Claude Code: 터미널 친화적, agentic 잘 됨\n\n결국 셋 다 비슷한 것 같기도 하고. 다들 뭐 쓰시나요?`,
  },
];

type CommentSeed = {
  postTitleStartsWith: string;  // 글 매칭용 (제목 앞부분)
  authorEmail: string;
  content: string;
};

const COMMENTS: CommentSeed[] = [
  // [B2B SaaS] 풀스택 공동창업자 모집
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "lee.backend@example.com", content: "Node 백엔드 7년차이고 핀테크 결제 통합 경험 많습니다. 자세한 스택 + MRR 공유 가능하시면 DM 주세요." },
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "yoo.flutter@example.com", content: "지분 5~15%면 풀타임이신지 파트타임도 가능하신지 궁금합니다." },
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "kang.pm@example.com", content: "PM 백그라운드인데, 시드 단계에서 PM이 따로 필요한 시점인지도 궁금하네요." },
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "jung.ac@example.com", content: "시드 라운드 4월 마감 너무 타이트해 보이는데 IR 덱 한 번 봐드릴 수 있어요. AC 컨설팅 글에 답글 부탁." },

  // 디자인 외주
  { postTitleStartsWith: "[2주] 모바일 앱", authorEmail: "park.designer@example.com", content: "다크 모드 전문이고 2주 일정 가능합니다. Behance 링크 DM 드릴게요." },
  { postTitleStartsWith: "[2주] 모바일 앱", authorEmail: "song.brand@example.com", content: "포트폴리오 보내드렸어요. 컴포넌트 정리까지 포함이면 250 생각 중인데 협의 가능합니다." },
  { postTitleStartsWith: "[2주] 모바일 앱", authorEmail: "han.planner@example.com", content: "혹시 디자인 시작 전에 IA 검토 필요하시면 기획자도 같이 끼어드릴 수 있어요." },

  // AC 컨설팅
  { postTitleStartsWith: "[시드 준비] IR", authorEmail: "jung.ac@example.com", content: "시드 단계 핀테크 IR 5건 완료 경험 있습니다. 6주면 가능. 비용은 후불 + 성과 옵션으로 협의 가능." },
  { postTitleStartsWith: "[시드 준비] IR", authorEmail: "moon.mentor@example.com", content: "정부지원사업 매칭도 같이 보면 시드 부족분 메꿀 수 있어요. 예비창업패키지/딥테크 등 가능합니다." },
  { postTitleStartsWith: "[시드 준비] IR", authorEmail: "kang.pm@example.com", content: "MAU 8000 ARR 1억이면 PMF 직전 단계 같은데, 시드 너무 빨리 받지 마시고 6개월 더 모은 후 시리즈A 직행도 옵션." },

  // MVP 기능 우선순위
  { postTitleStartsWith: "MVP 기능 우선순위", authorEmail: "han.planner@example.com", content: "Kano 모델 추천드려요. \"있어야만 만족\" vs \"없어도 OK\" 분리만 잘해도 7개로 줄어듭니다." },
  { postTitleStartsWith: "MVP 기능 우선순위", authorEmail: "kang.pm@example.com", content: "ICE 점수 (Impact·Confidence·Ease) 매겨서 상위 5개 잡으면 빠릅니다. 인터뷰는 ICE의 Confidence 보정용." },
  { postTitleStartsWith: "MVP 기능 우선순위", authorEmail: "yoo.flutter@example.com", content: "유저 인터뷰 12명에서 공통적으로 언급된 페인포인트만 솎아내면 보통 4~6개로 자연 수렴." },
  { postTitleStartsWith: "MVP 기능 우선순위", authorEmail: "kim.dev@example.com", content: "MVP는 \"이 기능 없으면 가입 안 함\" 기능만 남기는 게 정답. 나머지는 v2에." },

  // 토스페이먼츠 웹훅
  { postTitleStartsWith: "토스페이먼츠 웹훅", authorEmail: "im.devops@example.com", content: "Idempotency Key 패턴 코드 +1 합니다. Redis로 잠깐만 캐시하면 5회 재시도 무시 가능." },
  { postTitleStartsWith: "토스페이먼츠 웹훅", authorEmail: "kim.dev@example.com", content: "환불 시 결제 키 매칭 안 되면 30분 후 재시도 들어와서 더 골치아픔. webhook_log 테이블로 audit 추천." },
  { postTitleStartsWith: "토스페이먼츠 웹훅", authorEmail: "lee.backend@example.com", content: "코드 공유 부탁드립니다! 저도 Iamport에서 토스로 옮기는 중인데 비슷한 패턴 적용 중." },

  // 헬스케어 iOS 앱
  { postTitleStartsWith: "[헬스케어] iOS", authorEmail: "yoo.flutter@example.com", content: "Flutter 4년차이고 의료 도메인 경험 있습니다. 풀타임 가능. 지분 옵션도 OK." },
  { postTitleStartsWith: "[헬스케어] iOS", authorEmail: "kim.dev@example.com", content: "iOS Swift 가능합니다만 풀타임은 어렵고 프리랜서 2개월 가능합니다." },

  // 뉴스레터 추천
  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "kang.pm@example.com", content: "\"디스이스\" 추천. B2B SaaS 한국 케이스 위주라 도움 많이 됩니다." },
  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "noh.content@example.com", content: "\"퍼블리\" 무료 글도 의외로 인사이트 좋아요. 그리고 \"비즈한국\" 스타트업 섹션도." },
  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "moon.mentor@example.com", content: "\"여성기업종합지원센터 뉴스레터\"는 정부지원사업 마감일 추적용으로 필수예요." },
  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "park.designer@example.com", content: "디자인은 \"디자인스펙트럼\". 그로스 직접은 아니지만 시각적 영감 좋음." },
  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "im.devops@example.com", content: "엔지니어링 쪽이면 \"Real World Engineering\" + 토스 기술블로그 RSS 추천." },

  // 예비창업패키지 검토
  { postTitleStartsWith: "[정부지원] 예비창업패키지", authorEmail: "han.planner@example.com", content: "신청합니다! 4/12까지 v3 완성 가능합니다." },
  { postTitleStartsWith: "[정부지원] 예비창업패키지", authorEmail: "kim.dev@example.com", content: "검토 받고 싶습니다. 3년 만에 다시 신청이라 막막했는데 감사합니다." },
  { postTitleStartsWith: "[정부지원] 예비창업패키지", authorEmail: "yoo.flutter@example.com", content: "선착순 5명 안에 들었으면 좋겠네요. 신청합니다." },

  // B2B 영업 자동화
  { postTitleStartsWith: "[아이디어] B2B 영업", authorEmail: "kang.pm@example.com", content: "한국에서는 \"카톡 + 명함앱\" 콤보 깨는 게 가장 어려워요. 명함앱 데이터 가져오는 게 첫 단추일 듯." },
  { postTitleStartsWith: "[아이디어] B2B 영업", authorEmail: "lee.backend@example.com", content: "사람인 API 공식적으론 막혀있어서 데이터 수집부터 회색지대인 게 더 큰 문제예요." },
  { postTitleStartsWith: "[아이디어] B2B 영업", authorEmail: "noh.content@example.com", content: "B2B 콘텐츠 마케팅으로 인바운드 만들면 cold outreach 자체가 줄어듭니다. 한국 시장은 그쪽이 더 효율." },

  // 변호사 SaaS
  { postTitleStartsWith: "[아이디어] 1인 변호사", authorEmail: "jung.ac@example.com", content: "법률 도메인 진입 장벽이 큰 만큼 변호사 출신 공동창업자 1명은 거의 필수일 듯합니다." },
  { postTitleStartsWith: "[아이디어] 1인 변호사", authorEmail: "lee.backend@example.com", content: "개인정보보호법 + 법조윤리 둘 다 걸려서 데이터 처리 흐름 설계가 진짜 까다로울 거예요. 온디바이스 추론 검토 추천." },

  // 릴스 레시피 마켓
  { postTitleStartsWith: "[아이디어] 인스타 릴스", authorEmail: "song.brand@example.com", content: "크리에이터 입장에서 \"태그만 달면 자동 수익\"이면 매력적. 단 콜드 스타트(초기 크리에이터 모집)가 가장 어려움." },
  { postTitleStartsWith: "[아이디어] 인스타 릴스", authorEmail: "noh.content@example.com", content: "마켓컬리·SSG 둘 다 자체 인플루언서 프로그램 있어서 파트너십 영업이 핵심." },

  // 자영업 리뷰봇
  { postTitleStartsWith: "[아이디어] 자영업자용", authorEmail: "kang.pm@example.com", content: "월 1.9만원이면 1만 명 잡아야 월 1.9억. 사장님 채널 마케팅 어떻게 풀지가 진짜 고민될 듯." },
  { postTitleStartsWith: "[아이디어] 자영업자용", authorEmail: "moon.mentor@example.com", content: "소상공인진흥공단 디지털 바우처 (60만원) 매칭하면 \"실 결제 무료\" 마케팅 가능해서 초기 보급에 큰 무기." },

  // 정부지원사업 자동 매칭
  { postTitleStartsWith: "[아이디어] 정부지원사업", authorEmail: "moon.mentor@example.com", content: "K-Startup Open API 일부 공개되어있어서 매칭 자체는 어려운 일 아닙니다. 진짜 가치는 \"합격 사업계획서 RAG\" 부분." },
  { postTitleStartsWith: "[아이디어] 정부지원사업", authorEmail: "han.planner@example.com", content: "비슷한 시도 \"비즈인포\"가 있긴 한데 UX가 안 좋아서 1인 창업가는 안 씁니다. 디자인 + 알림 자동화로 차별화 가능." },

  // 솔로 창업 6개월 전
  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "yoo.flutter@example.com", content: "건강검진 미리. 그리고 가족·배우자랑 \"3개월 매출 0이어도 괜찮은가\" 솔직 대화. 이 두 개가 의외로 컸어요." },
  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "kim.dev@example.com", content: "신용카드·통신비·청약 등 자동이체 정리. 매달 고정비 -30만원 만들어두면 12개월이 18개월 됩니다." },
  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "han.planner@example.com", content: "퇴사 전에 동료들에게 \"제가 이런 거 만들 거예요\" 한 줄로 말하기 연습. 첫 100명 베타 거기서 다 나옵니다." },
  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "jung.ac@example.com", content: "퇴사하기 6개월 전에 IR 덱 v0 만들어보기. 회사 다닐 때 만든 게 훨씬 객관적이에요." },

  // 디자이너 → 창업가
  { postTitleStartsWith: "디자이너 → 창업가", authorEmail: "park.designer@example.com", content: "저도 같은 길 갔는데, Cursor + v0 조합으로 80% 가능했습니다. 결제·인증만 외주로 빠지는 게 가장 효율적." },
  { postTitleStartsWith: "디자이너 → 창업가", authorEmail: "lee.backend@example.com", content: "백엔드는 직접 학습보다 \"백엔드 가능한 공동창업자 1명 + 프롬프트 엔지니어링 본인\" 조합이 더 빠릅니다." },
  { postTitleStartsWith: "디자이너 → 창업가", authorEmail: "kim.dev@example.com", content: "결제·이메일·푸시 같은 \"반드시 망가지면 안 되는 인프라\"는 처음부터 외주. 나머지는 다 v0/Cursor로." },

  // 공동창업자 지분
  { postTitleStartsWith: "공동창업자 지분 협의", authorEmail: "jung.ac@example.com", content: "첫 미팅 때는 1) 비전·미션 일치 여부 2) 풀타임/파트타임 정도만. 지분은 2~3차 미팅에서 변호사 끼고." },
  { postTitleStartsWith: "공동창업자 지분 협의", authorEmail: "kang.pm@example.com", content: "첫 미팅에 vesting 4년 1년 cliff 정도만 컨셉 동의해두면 충분. 디테일은 텀시트 단계에서." },
  { postTitleStartsWith: "공동창업자 지분 협의", authorEmail: "moon.mentor@example.com", content: "친한 사이라도 (오히려 친할수록) 변호사 꼭 끼우세요. 분쟁 90%가 \"말로 합의했던 것\"에서 시작합니다." },

  // Supabase vs Firebase
  { postTitleStartsWith: "[기술] Supabase vs Firebase", authorEmail: "lee.backend@example.com", content: "Supabase. 결제 통합·실시간 알림·RLS 세 가지 다 필요하면 압도적으로 편합니다. 1000명까진 무료 티어로 충분." },
  { postTitleStartsWith: "[기술] Supabase vs Firebase", authorEmail: "im.devops@example.com", content: "Postgres 직접 쿼리 가능 vs Firestore의 NoSQL 제약. 결국 Supabase 추천." },
  { postTitleStartsWith: "[기술] Supabase vs Firebase", authorEmail: "kim.dev@example.com", content: "다만 Supabase Realtime은 1000 동시연결 무료. 그 이상 가면 비용 빠르게 올라가니 처음부터 채널 설계 잘 하세요." },

  // 1인 사업자 → 법인
  { postTitleStartsWith: "[법무] 1인 사업자", authorEmail: "jung.ac@example.com", content: "외부 투자 받을 가능성 0% 아니면 무조건 빨리 법인. 1억 매출도 법인 비용 회수 빠릅니다." },
  { postTitleStartsWith: "[법무] 1인 사업자", authorEmail: "moon.mentor@example.com", content: "법인 전환 시 부가세·소득세 분리되면 절세 효과 의외로 크니 세무사 상담 필수." },
  { postTitleStartsWith: "[법무] 1인 사업자", authorEmail: "han.planner@example.com", content: "법인 전환 비용 1000만원 든다고 하셨는데 이게 좀 비싼 견적이에요. 보통 300~500이면 가능." },

  // 인스타 광고 ROAS
  { postTitleStartsWith: "[그로스] 인스타 광고 ROAS", authorEmail: "noh.content@example.com", content: "UGC 가공이 정말 효과 좋죠. 다만 후기 수집 시 \"우리 직원 후기\" 안 섞이게 분리 필수. 광고 정책 위반 우려." },
  { postTitleStartsWith: "[그로스] 인스타 광고 ROAS", authorEmail: "park.designer@example.com", content: "\"오늘 도착\" CTA는 신선했어요. 시간 압박 + 행동 유도라는 두 효과가 동시에 들어가는 듯." },
  { postTitleStartsWith: "[그로스] 인스타 광고 ROAS", authorEmail: "kang.pm@example.com", content: "광고비 예산별 비교 댓글 부탁드립니다. 월 100/300/500 차이 궁금합니다." },

  // AWS 비용 80% 절감
  { postTitleStartsWith: "[기술] AWS 비용", authorEmail: "im.devops@example.com", content: "Graviton 진짜 사기. 호환성만 검증되면 35% 절감은 거의 공짜로 얻는 셈." },
  { postTitleStartsWith: "[기술] AWS 비용", authorEmail: "lee.backend@example.com", content: "VPC Endpoint로 NAT Gateway 비용 줄이는 게 의외로 효과 큼. 우리도 비슷한 패턴으로 월 80만원 절감했어요." },
  { postTitleStartsWith: "[기술] AWS 비용", authorEmail: "kim.dev@example.com", content: "CloudWatch 보관 90 → 14일 + Glacier 이거 아무도 안 한다고 하던데 진짜 임팩트 큰 개선. 공유 감사합니다." },

  // 결제 화면 1단계 줄여서
  { postTitleStartsWith: "[UX] 결제 화면", authorEmail: "park.designer@example.com", content: "Sticky bottom 결제 버튼이 작은 변경 같아도 모바일에서 효과가 진짜 크죠. 14% → 22%면 거의 1.6배." },
  { postTitleStartsWith: "[UX] 결제 화면", authorEmail: "han.planner@example.com", content: "\"기본 배송지 자동 선택\"은 사용자 인지부담 줄이는 핵심. 변경 빈도 낮은 항목은 원클릭으로 빼는 게 정답." },
  { postTitleStartsWith: "[UX] 결제 화면", authorEmail: "kang.pm@example.com", content: "결제 시간 92초 → 38초이면 페이지 이탈도 같이 줄었을 거 같은데, 그쪽 지표도 공유 가능하실까요?" },

  // 리텐션 5가지 레버
  { postTitleStartsWith: "[리텐션] 첫 100명", authorEmail: "kang.pm@example.com", content: "초대 보너스 50% off vs 무료 1개월 비교 데이터 정말 공유해주셔서 감사합니다. 제 가설이 정반대였는데 검증됨." },
  { postTitleStartsWith: "[리텐션] 첫 100명", authorEmail: "noh.content@example.com", content: "Onboarding 1분 영상의 skip rate 궁금합니다. 아마 80%+ 스킵일 텐데 그래도 효과 있는 게 흥미." },
  { postTitleStartsWith: "[리텐션] 첫 100명", authorEmail: "lee.backend@example.com", content: "\"지금 N명 활성\" 카운트는 백엔드에서 어떻게 구현하셨나요? Redis로 5분 윈도우 카운트인가요?" },

  // 솔로 창업 4개월 외로움
  { postTitleStartsWith: "솔로 창업 4개월차", authorEmail: "yoo.flutter@example.com", content: "공감합니다. 저는 같은 단계 솔로 창업가 3명 만들어서 매주 화요일 카페 미팅 했어요. 그것만으로도 외로움 80% 해결." },
  { postTitleStartsWith: "솔로 창업 4개월차", authorEmail: "jung.ac@example.com", content: "투자자 멘토 1명 두는 것도 추천. 매월 1시간 미팅이 의사결정의 외로움을 크게 덜어줍니다." },
  { postTitleStartsWith: "솔로 창업 4개월차", authorEmail: "im.devops@example.com", content: "운동 루틴 잡기. 저는 새벽 6시 헬스장 강제로 가는데, 그 시간이 아무 결정도 안 해도 되는 유일한 시간이라 좋아요." },
  { postTitleStartsWith: "솔로 창업 4개월차", authorEmail: "noh.content@example.com", content: "\"잘 되어가\" 답하기 어려울 땐 \"잘 모르겠는데 일단 하고 있어\"가 정답이에요. 지나치게 긍정적인 답변이 더 외로움 키움." },

  // 책상 위에 뭐 있나요
  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "im.devops@example.com", content: "ErgoDox EZ + Magic Trackpad. 키보드 깊이 있는 거 좋아하는데 트랙패드는 익숙해서 못 버려요." },
  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "lee.backend@example.com", content: "Apple Studio Display + MX Master 3S + 토스 텀블러 (애착). 터미널만 띄워놓고 작업해서 모니터 1개로 충분." },
  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "park.designer@example.com", content: "iPad Pro 12.9 + Apple Pencil. 와이어프레임은 종이가 더 빨라서 종이 노트도 항상 옆에." },
  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "song.brand@example.com", content: "wacom Cintiq 16 + 큰 모니터 1개. 모션 작업이 많아서 색감 캘리브레이션이 핵심." },

  // 성수 vs 강남 vs 판교
  { postTitleStartsWith: "성수동 vs 강남 vs 판교", authorEmail: "kim.dev@example.com", content: "성수가 가장 분위기 좋아요. \"라이트하우스\" 카페에서 매주 화/금 솔로 창업가 모임 있습니다." },
  { postTitleStartsWith: "성수동 vs 강남 vs 판교", authorEmail: "kang.pm@example.com", content: "B2B는 강남이 답. \"강남 빌리지\" 정기 모임 추천. 판교는 거리 + 차량 의존도 때문에 비추." },
  { postTitleStartsWith: "성수동 vs 강남 vs 판교", authorEmail: "noh.content@example.com", content: "콘텐츠/디자인 → 성수, 핀테크/B2B → 강남, 시리즈B+ 후기 → 판교. 단계별로 옮겨가는 게 자연스러움." },

  // Cursor vs Windsurf vs Claude
  { postTitleStartsWith: "Cursor vs Windsurf vs Claude", authorEmail: "kim.dev@example.com", content: "Claude Code agent 모드가 진짜 큰 차이. 30분 분량 task를 \"확인하고 자라\" 하면 2~3시간 동안 자동으로 끝남." },
  { postTitleStartsWith: "Cursor vs Windsurf vs Claude", authorEmail: "lee.backend@example.com", content: "팀 협업이면 Cursor 압도. AI Pair Programming은 Cursor가 가장 자연스럽습니다." },
  { postTitleStartsWith: "Cursor vs Windsurf vs Claude", authorEmail: "park.designer@example.com", content: "디자이너 입장에선 v0 + Lovable 조합이 더 임팩트 있음. 코드 에디터보다 시각적 결과물 우선." },
  { postTitleStartsWith: "Cursor vs Windsurf vs Claude", authorEmail: "yoo.flutter@example.com", content: "Flutter 코드는 셋 다 비슷합니다. 결국 본인 작업 패턴(키보드 vs 터미널 vs 음성)에 따라 결정." },

  // ── 추가 댓글 (각 글당 +2~4개) ──────────────────────────
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "noh.content@example.com", content: "공동창업자 모집글 작성 가이드도 같이 봐드릴 수 있어요. 톤·구체성에 따라 응답률 차이 큼." },
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "im.devops@example.com", content: "인프라·CI/CD 셋업이 필요하면 단기 프리랜서로 도와드릴 수 있습니다. 풀타임 합류는 어려우나 셋업만 1~2주." },
  { postTitleStartsWith: "[B2B SaaS] 풀스택", authorEmail: "moon.mentor@example.com", content: "여성 창업가 분이라면 여기서 추가로 정부지원 사업도 매칭 가능해요." },

  { postTitleStartsWith: "[2주] 모바일 앱", authorEmail: "noh.content@example.com", content: "디자인 끝나면 앱스토어 스크린샷 카피 + 콘텐츠 작업도 같이 의뢰 가능하시면 패키지 30% 할인 가능합니다." },
  { postTitleStartsWith: "[2주] 모바일 앱", authorEmail: "kim.dev@example.com", content: "디자이너랑 같이 일하는 개발자인데 Figma → Flutter 변환까지 한 팀으로 가시면 일정 1주 단축 가능." },
  { postTitleStartsWith: "[2주] 모바일 앱", authorEmail: "im.devops@example.com", content: "디자인 시스템 정리까지 포함이면 추후 v2/v3 작업할 때 시간 30% 절약 됩니다. 견적에 꼭 포함시키세요." },

  { postTitleStartsWith: "[시드 준비] IR", authorEmail: "noh.content@example.com", content: "MAU 8000은 PMF 입증 직전. 지금 바로 시드 받기보다 KPI 한 달만 더 누적하시면 valuation 1.3~1.5배 가능해요." },
  { postTitleStartsWith: "[시드 준비] IR", authorEmail: "han.planner@example.com", content: "기획자 출신인데 IR 덱 \"문제 정의 → 솔루션 → 트랙션\" 구조보다 \"트랙션 → 시장 → 팀\" 순서가 시드 단계엔 더 잘 먹혀요." },

  { postTitleStartsWith: "MVP 기능 우선순위", authorEmail: "im.devops@example.com", content: "기술적 관점: \"이 기능 없이도 데모 가능?\" 체크. 가능하면 v2로. 첫 사용자 10명에게 보여줄 5분 데모만 동작하면 OK." },
  { postTitleStartsWith: "MVP 기능 우선순위", authorEmail: "park.designer@example.com", content: "와이어프레임으로 스토리보드 만들어 5명에게 종이 프로토 테스트 → 안 묻는 기능 다 빼고 시작." },

  { postTitleStartsWith: "토스페이먼츠 웹훅", authorEmail: "kang.pm@example.com", content: "감사합니다. PM 관점에서도 \"환불 후 재구매 흐름\"이 항상 골치아픈데 이거 코드 베이스로 정리되겠네요." },
  { postTitleStartsWith: "토스페이먼츠 웹훅", authorEmail: "yoo.flutter@example.com", content: "결제 키 인덱스 안 만들어서 한 번 크게 데인 적 있어요. \"멱등성 키\" 키워드 모르고 시작했었는데 진짜 필수." },
  { postTitleStartsWith: "토스페이먼츠 웹훅", authorEmail: "noh.content@example.com", content: "비개발자도 \"환불 흐름\"이 가장 클레임 많은 부분이라 이거 정리되면 콘텐츠로도 풀어보고 싶네요." },

  { postTitleStartsWith: "[헬스케어] iOS", authorEmail: "lee.backend@example.com", content: "백엔드 (FHIR HL7 등 의료 표준) 경험 있는데 풀타임 1명만 뽑는 건가요?" },
  { postTitleStartsWith: "[헬스케어] iOS", authorEmail: "park.designer@example.com", content: "여성 헬스케어 디자인 경험 있어요. 디자이너 자리는 다 채워졌나요?" },
  { postTitleStartsWith: "[헬스케어] iOS", authorEmail: "han.planner@example.com", content: "도메인 진입 장벽 큰 만큼 의료 분야 도메인 어드바이저 1명 영입도 추천드려요." },

  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "kim.dev@example.com", content: "엔지니어링 추가: \"엘ㅇ\" 한국어 뉴스레터. 토스·당근 직원이 매주 글 씀. 생활 밀착." },
  { postTitleStartsWith: "한국 스타트업 뉴스레터", authorEmail: "song.brand@example.com", content: "브랜드 디자인이면 \"디파이브 위클리\" 추천. 스타트업 BI·제품 사례 정리 잘 됨." },

  { postTitleStartsWith: "[정부지원] 예비창업패키지", authorEmail: "song.brand@example.com", content: "신청합니다. 작년 떨어진 사업계획서 다시 다듬어볼 기회네요." },
  { postTitleStartsWith: "[정부지원] 예비창업패키지", authorEmail: "lee.backend@example.com", content: "5명 마감되더라도 후기 댓글 부탁드립니다. 다음 모집 때 참고하고 싶어요." },
  { postTitleStartsWith: "[정부지원] 예비창업패키지", authorEmail: "im.devops@example.com", content: "사업계획서 \"기술 차별화\" 부분만 따로 코칭 받을 수 있을까요? 거기만 막혀있어요." },

  { postTitleStartsWith: "[아이디어] B2B 영업", authorEmail: "park.designer@example.com", content: "UX 관점: \"카톡으로 받기\" 자체를 솔루션 안에 넣어버리는 게 어떨까요. 카톡 채널 → CRM 연동." },
  { postTitleStartsWith: "[아이디어] B2B 영업", authorEmail: "im.devops@example.com", content: "한국형 CRM이라면 \"리멤버\"가 명함 데이터 베이스 가지고 있어서 합병/제휴 시도가 답일 수도." },

  { postTitleStartsWith: "[아이디어] 1인 변호사", authorEmail: "moon.mentor@example.com", content: "AI 윤리·개인정보 풀어주는 게 핵심이라 법인보다 1인 변호사 베타 5명으로 검증 후 확장이 안전해 보여요." },
  { postTitleStartsWith: "[아이디어] 1인 변호사", authorEmail: "yoo.flutter@example.com", content: "법무법인 \"오래된\" 곳일수록 변화 거부 강해서 \"신생 1인 변호사\" 타깃이 맞아요. 진입 자체는 빠를 듯." },

  { postTitleStartsWith: "[아이디어] 인스타 릴스", authorEmail: "park.designer@example.com", content: "재료 자동 태깅이 핵심 기술인데 1인분 양 인식이 진짜 어려움. 컴퓨터 비전 모델 따로 학습 필요할 듯." },
  { postTitleStartsWith: "[아이디어] 인스타 릴스", authorEmail: "lee.backend@example.com", content: "수수료 7~10%면 마켓컬리·SSG 수익률보다 낮아서 협상 가능성 있어 보입니다. PoC 단계에서 직접 가서 미팅." },

  { postTitleStartsWith: "[아이디어] 자영업자용", authorEmail: "noh.content@example.com", content: "리뷰 응답 톤 학습이 핵심인데 사장님마다 \"내 톤\" 정의가 모호함. 처음 5개 리뷰 응답을 사장님이 직접 작성 → 그걸 학습." },
  { postTitleStartsWith: "[아이디어] 자영업자용", authorEmail: "park.designer@example.com", content: "카톡 봇 UX는 \"확인 → 보내기\" 2단계가 한계. 자영업자는 그것도 귀찮아함. \"자동 보내기\" 모드 옵션 필수." },

  { postTitleStartsWith: "[아이디어] 정부지원사업", authorEmail: "jung.ac@example.com", content: "정부지원사업 매칭 + 합격 사업계획서 RAG 결합이면 작년 \"비즈인포\"에서 시도했다 실패한 부분이라 차별점 명확합니다." },
  { postTitleStartsWith: "[아이디어] 정부지원사업", authorEmail: "kang.pm@example.com", content: "K-Startup API에서 사업 매핑 가능한 필드는 한정적이니, 분류 정확도가 가장 큰 기술적 도전이 될 듯." },

  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "park.designer@example.com", content: "디자인 도구 라이센스 (Figma·Adobe) 6개월치 미리 구매. 결제 끊기면 작업 중단되는 게 가장 큰 stress." },
  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "noh.content@example.com", content: "콘텐츠 캘린더 미리 6개월치 짜두기. 창업하고 나면 마케팅 \"오늘 뭘 올리지\" 고민할 시간 없음." },
  { postTitleStartsWith: "솔로 창업 시작하기 전", authorEmail: "song.brand@example.com", content: "브랜드 BI 1차 만들기 (3시간). 어차피 v2 가지만 \"어떤 톤이지\" 결정해두면 모든 의사결정 빨라짐." },

  { postTitleStartsWith: "디자이너 → 창업가", authorEmail: "song.brand@example.com", content: "Webflow + Memberstack 조합 추천. 마케팅 사이트 + 결제 + 회원 관리까지 코드 0줄로 가능합니다." },
  { postTitleStartsWith: "디자이너 → 창업가", authorEmail: "im.devops@example.com", content: "DevOps 입장에서: 처음에는 Vercel + Supabase + Stripe만 써서 \"인프라 외주 비용 0\". 트래픽 늘면 그때 컨설팅." },

  { postTitleStartsWith: "공동창업자 지분 협의", authorEmail: "kim.dev@example.com", content: "vesting 4년·1년 cliff은 표준. 다만 \"퇴사 시 acceleration\" 조항 (M&A 시 자동 vest) 미리 언급해두면 후속 협의 편함." },
  { postTitleStartsWith: "공동창업자 지분 협의", authorEmail: "han.planner@example.com", content: "비전·미션 일치 검증법: \"3년 후 회사가 어떻게 보였으면?\" 5분씩 각자 그려보기. 답이 비슷해야 시작 가능." },

  { postTitleStartsWith: "[기술] Supabase vs Firebase", authorEmail: "yoo.flutter@example.com", content: "Flutter면 둘 다 SDK 제공하는데 Firebase가 살짝 더 안정적입니다. iOS/Android 둘 다 푸시 알림 셋업이 빠름." },
  { postTitleStartsWith: "[기술] Supabase vs Firebase", authorEmail: "park.designer@example.com", content: "디자이너인데 Supabase 어드민 UI가 NoSQL Firestore보다 훨씬 직관적이라 \"DB 보고 데이터 직접 수정\"할 일이 많아질 거면 Supabase." },

  { postTitleStartsWith: "[법무] 1인 사업자", authorEmail: "kim.dev@example.com", content: "법인 전환 + 스톡옵션 발행이 한 번에 되는 게 \"외부 투자 받을 가능성\"의 진짜 이유. 1인 사업자는 스톡옵션 X." },

  { postTitleStartsWith: "[그로스] 인스타 광고 ROAS", authorEmail: "song.brand@example.com", content: "디자인 관점: 첫 1초 \"가격 강조\"는 폰트 크기보다 색 대비가 더 중요. 빨강/노랑 배경에 검정 글씨가 가장 뇌리에 남음." },
  { postTitleStartsWith: "[그로스] 인스타 광고 ROAS", authorEmail: "han.planner@example.com", content: "댓글 영역에 가격·구매 링크 두는 거 진짜 노하우네요. 광고 단가도 안 오르고 CTR도 잡고. 적용해보겠습니다." },

  { postTitleStartsWith: "[기술] AWS 비용", authorEmail: "yoo.flutter@example.com", content: "모바일 앱 백엔드는 Lambda 콜드 스타트 vs ECS 항상 켜져있는 선택이 중요. 트래픽 패턴에 따라 50% 차이 남." },

  { postTitleStartsWith: "[UX] 결제 화면", authorEmail: "noh.content@example.com", content: "결제 시간 60% 단축이면 광고 ROAS도 올라갈 거예요. 광고 → 결제 완료까지 시간이 광고 비용 효율과 직결." },

  { postTitleStartsWith: "[리텐션] 첫 100명", authorEmail: "park.designer@example.com", content: "Onboarding 영상 1분의 비결: \"skip 가능\" 표시를 처음에 강조해야 안 닫음. 강제 영상은 100% 이탈." },

  { postTitleStartsWith: "솔로 창업 4개월차", authorEmail: "song.brand@example.com", content: "공감해요. 저는 뭐 만들고 싶을 때 일부러 \"안 만들고 사용자에게 보여주는\" 일주일 갭 두는 중. 외로움 쌓이지만 결과적으로 더 나은 결정 됨." },
  { postTitleStartsWith: "솔로 창업 4개월차", authorEmail: "kang.pm@example.com", content: "팀 합류 vs 솔로 유지 둘 다 경험했는데, 솔로의 외로움 < 잘못된 팀의 답답함. 천천히 1명 영입이 답인 듯." },

  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "noh.content@example.com", content: "M2 MacBook + 외장 모니터 1개 + 스피커 1개. 책상 비울수록 작업 집중도 올라감. 미니멀 추천." },
  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "yoo.flutter@example.com", content: "Mac mini + 27 모니터 + 스튜디오 마이크. 미팅 많아서 음성 품질이 의외로 큼." },
  { postTitleStartsWith: "스타트업 사람들 책상", authorEmail: "han.planner@example.com", content: "노트북 1대 + 스탠드 + 외장 키보드/마우스. 카페 작업 많아서 매일 들고 다님. \"가벼운 셋업\"이 핵심." },

  { postTitleStartsWith: "성수동 vs 강남 vs 판교", authorEmail: "song.brand@example.com", content: "성수에 \"커먼그라운드\" 매주 일요일 디자이너 모임 있음. 디자인·브랜드 사람 만나기 좋음." },
  { postTitleStartsWith: "성수동 vs 강남 vs 판교", authorEmail: "lee.backend@example.com", content: "판교는 시리즈B+ 사람 많지만 솔로/시드 단계엔 거리감 큼. 처음에는 강남 또는 성수가 답." },

  { postTitleStartsWith: "Cursor vs Windsurf vs Claude", authorEmail: "im.devops@example.com", content: "DevOps 입장: Claude Code의 background agent로 \"새벽에 PR 자동 생성\"이 진짜 차이. 다음날 출근하면 PR 5개 대기." },
  { postTitleStartsWith: "Cursor vs Windsurf vs Claude", authorEmail: "han.planner@example.com", content: "비개발자도 v0 + Lovable로 prototype 가능한 시대. 그게 더 큰 변화 같아요." },
];

/** 시드 사용자 공통 비밀번호 — 멀티유저 테스트용 */
const SEED_PASSWORD = "demo1234";

async function ensureUser(email: string, name: string) {
  const hashedPassword = await hashPassword(SEED_PASSWORD);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // 기존 시드 사용자: 비밀번호를 공통값으로 강제 동기화
    if (existing.email !== "dolchi37@gmail.com" /* 본인 admin은 건드리지 않음 */) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashedPassword },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      planType: "FREE",
      creditBalance: 50,
    },
  });
}

/**
 * 인박스 테스트용 — 현재 로그인 사용자(ADMIN_EMAILS의 첫 번째)에게
 * 시드된 전문가들이 댓글·좋아요 달도록 만든다.
 */
async function seedInboxFor(adminEmail: string, expertEmails: string[]) {
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });
  if (!adminUser) {
    console.warn(`  ⚠ admin 계정 ${adminEmail}이 DB에 없어서 인박스 시드 스킵`);
    return;
  }

  // 1) 어드민 게시글 3건 생성 (없으면)
  const adminPosts: Array<{ title: string; content: string; category: PostCategory }> = [
    {
      title: "[질문] 첫 사용자 100명, 어디서 모으셨나요?",
      content: `MVP 출시 직전입니다. 첫 100명 베타 테스터를 어디서 모으는 게 가장 효과적이었는지 경험 공유 부탁드립니다.\n\n저는 지금:\n- 인스타그램 광고 (예산 50만원)\n- 디스이스 뉴스레터 협찬\n- 직접 DM (~30명)\n\n정도 검토 중인데, 다른 효율 좋은 채널 있을까요?`,
      category: "QUESTION",
    },
    {
      title: "[팀모집] AI 창업 워크스페이스 — 풀스택 1명 더 구합니다",
      content: `Widea 팀에서 풀스택 엔지니어 1명 추가 모집 중입니다.\n\n**현재 단계**\n- 베타 운영 중, 사용자 12명\n- 시드 라운드 검토 중\n\n**찾는 분**\n- Next.js·Express·Prisma 1년 이상\n- 0→1 단계의 카오스 즐기는 분\n- 지분 협의 가능\n\n관심 있으시면 댓글 또는 DM 부탁드립니다.`,
      category: "TEAM_RECRUIT",
    },
    {
      title: "[케이스] AI 회의록 SaaS, 첫 한 달 retention 데이터 공유",
      content: `Whisper + GPT 기반 회의록 SaaS의 첫 한 달 운영 데이터입니다.\n\n- D1 retention: 78%\n- D7 retention: 32%\n- D30 retention: 18%\n- 이탈 핵심 원인: \"실시간 자막 정확도\"\n\n실시간 정확도를 높이는 방법으로 어떤 시도들 해보셨나요?`,
      category: "CASE_STUDY",
    },
  ];

  for (const p of adminPosts) {
    const exists = await prisma.communityPost.findFirst({
      where: { title: p.title, authorId: adminUser.id },
    });
    if (exists) continue;
    await prisma.communityPost.create({
      data: {
        authorId: adminUser.id,
        title: p.title,
        content: p.content,
        category: p.category,
      },
    });
    console.log(`  ✓ admin 게시글: ${p.title.slice(0, 40)}...`);
  }

  // 2) 어드민 게시글에 댓글·좋아요 달기 (다양한 시간대로)
  const allAdminPosts = await prisma.communityPost.findMany({
    where: { authorId: adminUser.id },
  });

  const inboxComments: Array<{ postIdx: number; email: string; content: string }> = [
    { postIdx: 0, email: "noh.content@example.com", content: "콘텐츠 마케터 관점: 인스타 광고는 ROAS는 좋은데 \"우리 서비스를 진짜 원하는\" 사용자보단 호기심 사용자가 많이 들어와요. 디스이스 뉴스레터가 conversion 더 좋을 거예요." },
    { postIdx: 0, email: "han.planner@example.com", content: "직접 DM 30명 = 가장 좋은 방법. 1:1 인터뷰 같이 하면 첫 100명 안에 \"진짜 페인 가진\" 30명 + 호기심 70명 비율로 구성됨." },
    { postIdx: 0, email: "moon.mentor@example.com", content: "정부지원사업 베타테스터 모집은 어떨까요? 예비창업패키지 통과 팀들 한정 베타 → 50명 정도 빠르게 확보 가능." },
    { postIdx: 0, email: "kang.pm@example.com", content: "PM 관점에서 \"첫 100명\"보다 \"진짜 NPS 9 주는 첫 10명\"이 더 중요. 거기서 입소문 시작됨." },
    { postIdx: 0, email: "yoo.flutter@example.com", content: "관련 분야 카톡 오픈채팅방에 직접 들어가서 활동하기. 광고비 0원에 효과 큼." },

    { postIdx: 1, email: "lee.backend@example.com", content: "Next.js·Prisma 4년차이고 핀테크 SaaS 백엔드 경험. 풀타임 가능합니다. 자세한 스택 + MRR 공유 가능하시면 DM 주세요." },
    { postIdx: 1, email: "kim.dev@example.com", content: "풀스택 6년차이고 Widea 같은 도메인 (창업 도구) 관심 많습니다. 지분 옵션 어떻게 되나요?" },
    { postIdx: 1, email: "im.devops@example.com", content: "DevOps만 단기 합류 가능합니다. 인프라 셋업 1~2주 봐드릴 수 있어요." },
    { postIdx: 1, email: "yoo.flutter@example.com", content: "모바일 앱 부분 합류도 검토 중이시면 답글 주세요. Flutter 4년차." },

    { postIdx: 2, email: "im.devops@example.com", content: "Whisper Large v3 Turbo 모델 버전 시도해보셨나요? 정확도 +15% 정도 향상 봤어요." },
    { postIdx: 2, email: "lee.backend@example.com", content: "실시간 자막 정확도 = 핵심 차별화. 한국어 모델은 fine-tuning 정도까지 안 가면 어려운 게 사실." },
    { postIdx: 2, email: "kang.pm@example.com", content: "D7 retention 32%면 SaaS 평균(20%)보다 훨씬 좋은데요? D30이 18%로 떨어지는 게 아쉬운데, 그 원인이 정확도 외에도 더 있는지 분석해보면 좋을 것." },
    { postIdx: 2, email: "noh.content@example.com", content: "회의록 자체보다 \"회의록 → 액션 아이템 자동 추출\" 같은 후속 가치가 retention 핵심일 듯. 정확도와 별개로." },
    { postIdx: 2, email: "park.designer@example.com", content: "UX 측면: 정확도 100% 어려우니 \"틀린 부분 한 번 클릭으로 수정\"이 잘 되는지가 중요. 수정 UX 보여주실 수 있나요?" },
  ];

  let inboxCommentCount = 0;
  for (const c of inboxComments) {
    const post = allAdminPosts[c.postIdx];
    if (!post) continue;
    const author = await prisma.user.findUnique({ where: { email: c.email } });
    if (!author) continue;
    const exists = await prisma.postComment.findFirst({
      where: { postId: post.id, authorId: author.id, content: c.content },
    });
    if (exists) continue;
    await prisma.postComment.create({
      data: { postId: post.id, authorId: author.id, content: c.content },
    });
    inboxCommentCount++;
  }

  // 좋아요 — 각 게시글에 5~7명씩
  let inboxLikeCount = 0;
  for (const post of allAdminPosts) {
    const liked = expertEmails.slice(0, Math.min(6, expertEmails.length));
    for (const email of liked) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (!u) continue;
      const exists = await prisma.postLike.findUnique({
        where: { userId_postId: { userId: u.id, postId: post.id } },
      });
      if (exists) continue;
      await prisma.postLike.create({
        data: { userId: u.id, postId: post.id },
      });
      inboxLikeCount++;
    }
  }

  console.log(`  ✓ admin 인박스 시드: 댓글 ${inboxCommentCount}건, 좋아요 ${inboxLikeCount}건`);
}

async function main() {
  console.log("[seed] 전문가 프로필 + 커뮤니티 글 시드 시작...\n");

  // 1. 전문가 프로필 12건
  const userMap = new Map<string, string>();
  for (const e of EXPERTS) {
    const u = await ensureUser(e.email, e.name);
    userMap.set(e.email, u.id);

    await prisma.expertProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        category: e.category,
        headline: e.headline,
        bio: e.bio,
        skills: e.skills,
        hourlyRateMin: e.hourlyRateMin,
        hourlyRateMax: e.hourlyRateMax,
        links: e.links,
        location: e.location,
        available: true,
      },
      update: {
        category: e.category,
        headline: e.headline,
        bio: e.bio,
        skills: e.skills,
        hourlyRateMin: e.hourlyRateMin,
        hourlyRateMax: e.hourlyRateMax,
        links: e.links,
        location: e.location,
        available: true,
      },
    });
    console.log(`  ✓ ${e.name} (${e.category})`);
  }

  // 2. 커뮤니티 글 9개
  console.log("\n[seed] 커뮤니티 글 작성 중...");
  for (const p of POSTS) {
    const userId = userMap.get(p.authorEmail);
    if (!userId) {
      console.warn(`  ⚠ ${p.authorEmail} not found, skipped`);
      continue;
    }
    // 같은 제목 중복 방지
    const exists = await prisma.communityPost.findFirst({
      where: { title: p.title, authorId: userId },
    });
    if (exists) {
      console.log(`  - skipped (이미 존재): ${p.title.slice(0, 40)}...`);
      continue;
    }
    await prisma.communityPost.create({
      data: {
        authorId: userId,
        title: p.title,
        content: p.content,
        category: p.category,
      },
    });
    console.log(`  ✓ [${p.category}] ${p.title.slice(0, 40)}...`);
  }

  // 3. 댓글 시드
  console.log("\n[seed] 댓글 작성 중...");
  let commentCreated = 0;
  let commentSkipped = 0;
  for (const c of COMMENTS) {
    const authorId = userMap.get(c.authorEmail);
    if (!authorId) {
      console.warn(`  ⚠ ${c.authorEmail} not found, comment skipped`);
      continue;
    }
    // 글 매칭 — 제목으로 시작하는 글 찾기
    const post = await prisma.communityPost.findFirst({
      where: { title: { startsWith: c.postTitleStartsWith } },
    });
    if (!post) {
      console.warn(`  ⚠ post not found: "${c.postTitleStartsWith}..."`);
      continue;
    }
    // 같은 사용자가 같은 글에 같은 내용 댓글 중복 방지
    const exists = await prisma.postComment.findFirst({
      where: { postId: post.id, authorId, content: c.content },
    });
    if (exists) {
      commentSkipped++;
      continue;
    }
    await prisma.postComment.create({
      data: { postId: post.id, authorId, content: c.content },
    });
    commentCreated++;
  }
  console.log(`  ✓ ${commentCreated}건 생성, ${commentSkipped}건 스킵 (이미 존재)`);

  // 4. admin 인박스 테스트 시드 (현재 로그인 유저 = ADMIN_EMAILS 첫 번째)
  console.log("\n[seed] admin 인박스 테스트 데이터...");
  const adminEmail = (process.env.ADMIN_EMAILS ?? "").split(",")[0].trim();
  if (adminEmail) {
    await seedInboxFor(adminEmail, EXPERTS.map((e) => e.email));
  } else {
    console.warn("  ⚠ ADMIN_EMAILS 환경변수 없음 — 인박스 시드 스킵");
  }

  console.log(`\n=== 시드 완료 ===`);
  console.log(`  전문가: ${EXPERTS.length}명`);
  console.log(`  커뮤니티 글: ${POSTS.length}개`);
  console.log(`  댓글: ${commentCreated}건 신규 (총 ${COMMENTS.length}건 정의)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
