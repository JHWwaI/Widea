import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { buildCaseEmbeddingText } from "../src/lib/caseEmbedding.js";

// ─────────────────────────────────────────────────────────────
// Pinecone 연동은 선택적 — 환경 변수 3개가 모두 있을 때만 활성화
// ─────────────────────────────────────────────────────────────

type UpsertCaseFn = typeof import("../src/lib/vectorDb.js").upsertCase;

const prisma = new PrismaClient();

/**
 * Pinecone 환경 변수 3개가 모두 있을 때만 vectorDb 모듈을 동적 로드한다.
 * 없으면 null을 반환하여 PostgreSQL-only 모드로 동작.
 */
async function loadUpsertCase(): Promise<UpsertCaseFn | null> {
  const hasPineconeEnv =
    process.env.PINECONE_API_KEY &&
    process.env.PINECONE_INDEX_NAME &&
    process.env.GEMINI_API_KEY;

  if (!hasPineconeEnv) return null;

  const mod = await import("../src/lib/vectorDb.js");
  return mod.upsertCase;
}

// ─────────────────────────────────────────────────────────────
// 15개사 초고해상도 비즈니스 모델 하드코딩 데이터
// ─────────────────────────────────────────────────────────────

interface StartupMeta {
  companyName: string;
  industry: string;
  foundedYear: number;
  fundingStage: string;
  revenueModel: string;
  targetMarket: string;
}

interface DeepAnalysis {
  problem: string;
  solution: string;
  initialWedge: string;
  unfairAdvantage: string;
  revenueUnitEconomics: string;
  signatureMoves: string;
}

interface StartupSeed {
  meta: StartupMeta;
  deepAnalysis: DeepAnalysis;
}

const STARTUPS: StartupSeed[] = [
  {
    meta: {
      companyName: "Notion",
      industry: "B2B SaaS",
      foundedYear: 2013,
      fundingStage: "Post-IPO",
      revenueModel: "Freemium Subscription",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "문서, 위키, 프로젝트 관리가 각각 다른 툴로 파편화되어 업무 효율성이 크게 저하되고, 정보를 찾기 위해 3~4개 앱을 오가며 컨텍스트 스위칭 비용이 발생한다.",
      solution:
        "레고 블록처럼 텍스트, 이미지, 데이터베이스를 자유롭게 조립할 수 있는 올인원 워크스페이스. 하나의 페이지 안에서 문서 작성, 칸반 보드, 스프레드시트, 캘린더를 모두 구현 가능하다.",
      initialWedge:
        "실리콘밸리 스타트업 디자이너/개발자들을 타겟으로, 기존 에버노트 유저들의 이탈을 노려 데이터 임포트 기능을 제공했다. 초기엔 초대 코드 기반 대기자 명단으로 희소성을 만들었다.",
      unfairAdvantage:
        "압도적으로 유연한 데이터베이스 블록 아키텍처와 미려한 UI/UX. 경쟁사(Confluence, Coda)가 단일 블록 구조를 따라했지만 Notion의 중첩형(Nested) 데이터베이스 설계를 재현하지 못했다.",
      revenueUnitEconomics:
        "개인 무료, 팀 단위 월 $8~$15 구독료로 안정적인 MRR 확보. 2023년 기준 ARR $4억+ 추정, 팀 플랜 전환율이 핵심 성장 지표이다.",
      signatureMoves:
        "유저들이 직접 템플릿을 만들어 공유하고 판매할 수 있는 '템플릿 갤러리' 기반의 강력한 커뮤니티 바이럴 루프. 한국에서는 노션 한국 커뮤니티가 자발적으로 형성되어 오가닉 성장을 견인했다.",
    },
  },
  {
    meta: {
      companyName: "Calendly",
      industry: "B2B SaaS",
      foundedYear: 2013,
      fundingStage: "Series C",
      revenueModel: "Freemium Subscription",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "미팅 시간 조율을 위해 이메일과 메시지를 수차례 주고받아야 하는 번거로움. 시간대가 다른 글로벌 팀 간에는 이 문제가 더욱 심각해진다.",
      solution:
        "자신의 빈 시간을 링크 하나로 공유하고, 상대방이 클릭해 예약하면 캘린더에 자동 연동되는 서비스. 시간대 자동 변환과 충돌 방지가 핵심이다.",
      initialWedge:
        "외부 미팅이 잦은 프리랜서, 영업 사원, 채용 담당자들을 뾰족하게 타겟팅. 특히 '하루에 미팅 5개 이상'인 B2B 세일즈 팀의 극심한 페인포인트를 공략했다.",
      unfairAdvantage:
        "구글, 아웃룩 등 이메일 생태계와의 완벽하고 빠른 API 동기화 기술력. 경쟁사 대비 압도적으로 적은 설정 단계(3클릭 이내)의 온보딩 경험.",
      revenueUnitEconomics:
        "기본 기능 무료, 팀 기능 및 결제 연동 시 월 $10~$15 과금. 기업용 플랜은 사용자당 $16/월. PLG 모델로 CAC가 매우 낮다.",
      signatureMoves:
        "Product-Led Growth(PLG)의 정석. 사용자가 링크를 남에게 보낼 때마다 자연스럽게 제품이 홍보되는 내재적 바이럴 루프. 받는 사람이 '이 편리한 게 뭐지?'라며 가입하는 선순환 구조.",
    },
  },
  {
    meta: {
      companyName: "Toss",
      industry: "FinTech",
      foundedYear: 2013,
      fundingStage: "Pre-IPO",
      revenueModel: "Transaction Fee & Ads",
      targetMarket: "B2C",
    },
    deepAnalysis: {
      problem:
        "공인인증서와 보안카드 필수 입력으로 인해 모바일 송금 과정이 극도로 불편했다. 은행 앱은 UI가 복잡하고 계좌번호를 외워야 했다.",
      solution:
        "공인인증서 없이 비밀번호나 지문만으로 10초 만에 이체 가능한 간편 송금 서비스. 연락처 기반 송금으로 계좌번호 없이도 돈을 보낼 수 있다.",
      initialWedge:
        "더치페이와 소액 송금이 잦은 10~20대 대학생 및 사회초년생 그룹 타겟팅. 술자리 뒤 '1/N' 정산 시나리오를 핵심 유스케이스로 잡았다.",
      unfairAdvantage:
        "초기 금융망 직접 연동 대신 은행 웹사이트를 스크래핑하는 우회 기술력으로 규제 틈새 공략. 이후 전자금융업 라이선스를 획득하여 합법적 기반 확보.",
      revenueUnitEconomics:
        "무료 송금으로 트래픽을 모은 후, 대출 중개 수수료, 결제망 수수료 및 맞춤형 금융 상품 광고로 수익화. 2023년 매출 약 1조 원, 대출 중개가 최대 수익원.",
      signatureMoves:
        "'내 신용점수 확인하기', '만보기' 등 송금 외적으로 매일 앱을 켜게 만드는 체류형 미니 서비스 연쇄 출시. 금융 슈퍼앱 전략으로 MAU 2,100만 명 달성.",
    },
  },
  {
    meta: {
      companyName: "Airbnb",
      industry: "Marketplace",
      foundedYear: 2008,
      fundingStage: "Post-IPO",
      revenueModel: "Transaction Commission",
      targetMarket: "B2C",
    },
    deepAnalysis: {
      problem:
        "비싼 호텔 요금과 현지 문화를 경험할 수 없는 획일화된 숙박 시설. 여행의 '살아보기' 경험에 대한 잠재 수요가 충족되지 않고 있었다.",
      solution:
        "남는 방이나 집을 여행객에게 빌려주고 수익을 창출하는 P2P 숙박 중개 플랫폼. 호스트는 부수입을, 게스트는 저렴하고 독특한 숙소를 얻는 양면 마켓플레이스.",
      initialWedge:
        "2007년 샌프란시스코 대규모 디자인 컨퍼런스 기간, 호텔이 매진된 상황에서 참가자들에게 에어베드 3개를 제공한 것이 시작. '호텔 대안'이 아닌 '현지인의 집'이라는 프레이밍.",
      unfairAdvantage:
        "호스트와 게스트 양방향 리뷰 시스템 및 100만 달러 호스트 보호 프로그램으로 구축한 신뢰 인프라. 경쟁자가 리뷰 자산을 단기간에 복제하기 불가능하다.",
      revenueUnitEconomics:
        "호스트에게 3%, 게스트에게 약 14% 수준의 수수료 부과. 글로벌 평균 객단가 약 $150/박 기준 건당 약 $25 수익. 2023년 매출 약 $99억.",
      signatureMoves:
        "초기 Craigslist에 매물을 자동 포스팅하는 기술적 해킹과 전문 사진작가 무료 파견으로 매물 퀄리티를 극대화. '체험(Experience)' 카테고리 추가로 숙박 외 수익원 확장.",
    },
  },
  {
    meta: {
      companyName: "Canva",
      industry: "Design SaaS",
      foundedYear: 2012,
      fundingStage: "Late Stage",
      revenueModel: "Freemium Subscription",
      targetMarket: "B2B2C",
    },
    deepAnalysis: {
      problem:
        "포토샵 등 기존 디자인 툴은 배우기 너무 어렵고 라이선스 비용이 비싸다. 비디자이너(마케터, 교사, 소상공인)가 간단한 이미지 하나 만들기 위해 전문 툴을 익혀야 하는 진입 장벽.",
      solution:
        "누구나 웹에서 드래그 앤 드롭으로 전문가 수준의 이미지를 만들 수 있는 템플릿 기반 디자인 툴. 설치 없이 브라우저에서 즉시 사용 가능하다.",
      initialWedge:
        "학교 졸업앨범 제작자 및 매일 SNS 이미지를 찍어내야 하는 소셜 미디어 마케터 타겟팅. 초기 호주 시장에서 교사/학생 대상 무료 제공으로 바이럴 확산.",
      unfairAdvantage:
        "설치가 필요 없는 WebGL 기반의 가벼운 에디터와 수백만 개의 에셋 라이브러리. 1억 개 이상의 템플릿/사진/폰트를 보유한 콘텐츠 자산은 후발 주자가 단기간에 확보 불가능.",
      revenueUnitEconomics:
        "개인 무료, 배경 제거 등 고급 기능이 포함된 Pro 플랜 월 $12.99. Teams 플랜 1인당 $14.99. 2023년 ARR $21억 돌파, 유료 전환율 약 10%.",
      signatureMoves:
        "'인스타그램 스토리 템플릿', '유튜브 썸네일 만들기' 등 유저들의 목적형 검색 키워드를 모두 장악하는 대규모 SEO 랜딩 페이지 전략. 수십만 개의 롱테일 키워드 페이지가 매월 수천만 오가닉 유입을 만든다.",
    },
  },
  {
    meta: {
      companyName: "Stripe",
      industry: "FinTech Infrastructure",
      foundedYear: 2010,
      fundingStage: "Late Stage",
      revenueModel: "Transaction Fee",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "온라인 결제 시스템을 연동하려면 은행과 수개월의 협상, 복잡한 레거시 코드 연동, PCI-DSS 인증이 필요했다. 개발자가 결제를 '붙이는 데'만 수주~수개월이 소요.",
      solution:
        "단 7줄의 코드로 즉시 결제를 받을 수 있는 개발자 친화적 API 플랫폼. 카드 결제, 구독, 인보이스, 세금 계산까지 결제 인프라 전체를 API로 추상화.",
      initialWedge:
        "결제 연동에 고통받던 Y Combinator 동기 스타트업 창업자들과 실리콘밸리 해커 커뮤니티. 공동 창업자가 직접 노트북을 빌려 코드를 심어주는 'Collison Installation'으로 첫 100명 확보.",
      unfairAdvantage:
        "업계 최고 수준의 깔끔한 API 문서화와 즉각적인 계정 활성화(가입 즉시 테스트 가능). 개발자 경험(DX)이 곧 해자(Moat)가 되어 전환 비용이 극도로 높다.",
      revenueUnitEconomics:
        "초기 비용 없이 결제 건당 2.9% + 30센트 수수료 수취. Shopify, Amazon 등 대규모 고객에게는 볼륨 할인. 2023년 총 결제 처리액 $1조+, 매출 약 $170억.",
      signatureMoves:
        "'Collison Installation' — 창업자가 유저의 노트북을 직접 빼앗아 그 자리에서 자사 코드를 심어주고 연동시켜 버리는 극단적 온보딩. 이후 Atlas(법인 설립), Radar(사기 방지) 등 결제 주변 서비스로 확장.",
    },
  },
  {
    meta: {
      companyName: "Slack",
      industry: "B2B SaaS",
      foundedYear: 2013,
      fundingStage: "Acquired",
      revenueModel: "Freemium Subscription",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "이메일 기반 소통은 속도가 느리고, 부서 간 정보가 파편화되어 업무 흐름이 끊긴다. 'RE: RE: RE:' 이메일 체인은 맥락 파악이 불가능하다.",
      solution:
        "주제별 '채널' 중심의 실시간 채팅과 외부 업무 툴(구글 드라이브, GitHub 등)의 완벽한 알림 연동. 검색 가능한 아카이브로 조직의 지식 허브 역할.",
      initialWedge:
        "IRC 등 기존 투박한 채팅 툴에 불만을 가진 개발팀 및 테크 스타트업 타겟팅. 게임 회사 Tiny Speck의 내부 커뮤니케이션 도구로 시작해 외부 공개.",
      unfairAdvantage:
        "타의 추종을 불허하는 2,400+ 서드파티 앱 연동 생태계와 특유의 유쾌한 카피라이팅, 커스텀 이모지 등 디테일 UX. 전환 비용이 조직 전체에 걸쳐 매우 높다.",
      revenueUnitEconomics:
        "최근 1만 개 메시지까지만 무료 보관, 영구 보관 및 고급 기능을 위해 1인당 월 $8.75 과금. Enterprise Grid는 별도 견적. Salesforce가 $277억에 인수.",
      signatureMoves:
        "경영진이 탑다운으로 도입하는 것이 아니라, 실무진들이 무료 버전으로 몰래 쓰다가 팀 전체로 퍼지는 바텀업(Bottom-up) B2B 침투 전략. 'Slack이 이메일을 죽인다'는 대담한 포지셔닝.",
    },
  },
  {
    meta: {
      companyName: "Duolingo",
      industry: "EdTech",
      foundedYear: 2011,
      fundingStage: "Post-IPO",
      revenueModel: "Ads & Subscription",
      targetMarket: "B2C",
    },
    deepAnalysis: {
      problem:
        "외국어 학습은 비용이 많이 들고 지루하여 포기율이 매우 높다. 기존 어학 서비스는 월 수만~수십만 원을 내야 하고, 동기 부여 설계가 부재하다.",
      solution:
        "게임을 하듯 짧게(Bite-sized) 매일 5분씩 학습할 수 있는 무료 모바일 어학 앱. 레벨업, 보석, 리더보드 등 게이미피케이션 요소로 학습 지속률을 극대화.",
      initialWedge:
        "무료로 영어나 스페인어를 배우고 싶어 하는 학생들. 초기엔 유저들의 번역 결과를 모아 기업에 번역 데이터로 판매하는 독특한 크라우드소싱 수익 모델을 시도.",
      unfairAdvantage:
        "수억 명의 학습 데이터를 바탕으로 한 정교한 A/B 테스트 인프라와 행동 심리학 기반의 커리큘럼. 뇌과학적으로 최적화된 복습 주기(Spaced Repetition)를 알고리즘화.",
      revenueUnitEconomics:
        "무료 유저에게 광고 노출, 하트(생명) 제한이 없는 Super 구독료 월 $6.99. 가족 플랜 월 $9.99. 2023년 매출 $5.3억, 유료 구독자 700만 명+.",
      signatureMoves:
        "학습을 거르면 슬퍼하거나 분노하는 부엉이 마스코트(Duo)의 집요한 푸시 알림과 '연속 학습일(Streak)' 유지라는 강력한 심리적 락인. TikTok 밈으로 바이럴되며 Z세대 문화 아이콘화.",
    },
  },
  {
    meta: {
      companyName: "Noom",
      industry: "Digital Health",
      foundedYear: 2008,
      fundingStage: "Series F",
      revenueModel: "Premium Subscription",
      targetMarket: "B2C",
    },
    deepAnalysis: {
      problem:
        "단순한 칼로리 계산이나 굶는 다이어트는 요요 현상을 유발하며 심리적 습관을 고치지 못한다. 근본적인 행동 변화 없이는 체중 감량이 지속되지 않는다.",
      solution:
        "인지행동치료(CBT) 기반의 매일 읽는 심리 아티클과 1:1 휴먼/AI 코칭을 결합한 체중 감량 프로그램. '다이어트 앱'이 아닌 '행동 변화 플랫폼'으로 포지셔닝.",
      initialWedge:
        "극단적 다이어트에 지치고 '지속 가능한 건강'을 찾는 밀레니얼 여성 타겟팅. 특히 신년 다짐 시즌(1~2월)에 Facebook/Instagram 집중 광고.",
      unfairAdvantage:
        "자체 개발한 심리학 커리큘럼과 코치 1명이 수백 명을 관리할 수 있는 백엔드 AI 코칭 어시스턴트 인프라. 타사 대비 코칭 비용이 1/10 수준.",
      revenueUnitEconomics:
        "기본 기능 없이 유료 구독 중심으로 운영. 수개월 과정에 약 $150~$200 선결제. 높은 ARPU 대신 광고비도 공격적(연간 수억 달러 규모 퍼포먼스 마케팅).",
      signatureMoves:
        "가입 직후 나이, 체중, 심리 상태 등을 묻는 5~10분짜리 극도로 긴 설문조사. 이 과정에서 유저의 '매몰 비용(Sunk Cost)'을 극대화하여 결제 전환율을 높이는 심리학적 퍼널 설계.",
    },
  },
  {
    meta: {
      companyName: "Figma",
      industry: "Design SaaS",
      foundedYear: 2012,
      fundingStage: "Late Stage",
      revenueModel: "Subscription",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "UI/UX 디자인 작업이 Mac에 종속(Sketch)되어 있고, 개발자나 기획자와 파일을 주고받는 과정이 비효율적이다. .sketch 파일을 이메일로 공유하고 버전 충돌이 빈번했다.",
      solution:
        "링크 하나로 접속해 구글 문서처럼 실시간 다중 접속 및 협업이 가능한 브라우저 기반 디자인 툴. 디자이너-개발자-PM이 동시에 같은 화면을 보며 작업.",
      initialWedge:
        "다양한 OS를 혼용하고 원격 근무가 잦은 테크 스타트업의 디자인/개발 협업 팀 타겟팅. '뷰어 무제한 무료' 정책으로 비디자이너까지 자연스럽게 유입.",
      unfairAdvantage:
        "C++를 WebAssembly로 컴파일하여 브라우저 위에서도 렉 없이 무거운 그래픽을 렌더링하는 압도적 기술력. 4년간 은밀히 개발한 CRDT 기반 실시간 동기화 엔진.",
      revenueUnitEconomics:
        "에디터 권한을 가진 유저당 월 $12~$15 과금, 뷰어는 무제한 무료. Adobe가 $200억에 인수 시도(무산). 2023년 ARR $6억+ 추정.",
      signatureMoves:
        "유저들이 만든 디자인 시스템, UI 키트, 플러그인을 공유하는 'Figma Community'를 구축하여 단순 툴을 넘어선 생태계 장악. FigJam(화이트보드)으로 비디자이너 영역까지 확장.",
    },
  },
  {
    meta: {
      companyName: "Karrot",
      industry: "C2C Marketplace",
      foundedYear: 2015,
      fundingStage: "Series D",
      revenueModel: "Local Ads",
      targetMarket: "B2C",
    },
    deepAnalysis: {
      problem:
        "기존 중고거래 플랫폼은 익명성으로 인한 사기 비율이 높고 택배 발송의 번거로움이 존재한다. 사기 피해와 배송비 때문에 저가 물건은 거래 자체가 불가능했다.",
      solution:
        "GPS 인증 기반으로 내 동네(반경 6km 이내) 사람들과 직접 만나서 직거래하는 플랫폼. 매너온도 시스템으로 신뢰를 정량화.",
      initialWedge:
        "밀도 높은 직장인 커뮤니티인 판교 테크노밸리 직원들의 사내/지역 중고거래에서 시작. 지역 밀도가 충분해질 때까지 한 동네씩 순차 확장하는 '동네 단위 런칭' 전략.",
      unfairAdvantage:
        "철저한 동네 인증과 매너온도 시스템으로 구축한 높은 신뢰도, 그리고 극강의 네트워크 밀도. 지역 커뮤니티 효과로 후발 주자가 같은 동네에서 밀도를 확보하기 극도로 어렵다.",
      revenueUnitEconomics:
        "거래 수수료는 0원. 동네 소상공인(미용실, 학원, 세탁소 등)의 타겟팅 지역 광고로 수익 창출. 2023년 매출 약 500억 원, 한국 MAU 1,800만 명.",
      signatureMoves:
        "택배 거래를 시스템적으로 배제하고 철저히 직거래만 유도하여 '동네 이웃과 마주치는' 따뜻한 브랜드 경험(커뮤니티화) 구축. 중고거래를 넘어 동네생활, 알바, 부동산까지 로컬 슈퍼앱 확장.",
    },
  },
  {
    meta: {
      companyName: "Zoom",
      industry: "Video Conferencing",
      foundedYear: 2011,
      fundingStage: "Post-IPO",
      revenueModel: "Freemium Subscription",
      targetMarket: "B2B2C",
    },
    deepAnalysis: {
      problem:
        "기존 화상 회의(WebEx, Skype)는 무겁고 끊김이 심하며 참가자가 계정을 만들어야 하는 허들이 높다. 설치와 설정 과정에서 미팅 시작 전에 10분을 허비하는 일이 빈번.",
      solution:
        "링크 클릭 한 번이면 브라우저나 가벼운 클라이언트에서 즉시 접속되는 끊김 없는 화상 회의. '그냥 돌아가는(It just works)' 경험에 모든 기술력을 집중.",
      initialWedge:
        "기존 툴에 불만이 팽배했던 고등교육 기관(대학)과 실리콘밸리 B2B 기업 타겟팅. 창업자 Eric Yuan은 WebEx 엔지니어 출신으로 기존 제품의 한계를 정확히 파악.",
      unfairAdvantage:
        "모바일 네트워크나 불안정한 환경에서도 영상이 깨지지 않고 유지되는 독자적인 비디오 라우팅 아키텍처. 자체 데이터센터 기반의 글로벌 미디어 인프라.",
      revenueUnitEconomics:
        "1:1은 무제한, 3인 이상은 40분 무료. 기업용 플랜 호스트당 월 $14.99~$21.99. 2023년 매출 $45억, 기업 고객 21만+.",
      signatureMoves:
        "'40분 무료 제한' — 회의가 한창 무르익을 때 끊기게 만들어 유저가 스스로 유료 결제의 필요성을 절감하게 하는 완벽한 프리미엄 게이트. 팬데믹이 전례 없는 성장 촉매.",
    },
  },
  {
    meta: {
      companyName: "Substack",
      industry: "Creator Economy",
      foundedYear: 2017,
      fundingStage: "Series B",
      revenueModel: "Revenue Share",
      targetMarket: "B2B2C",
    },
    deepAnalysis: {
      problem:
        "글을 쓰는 작가나 언론인이 독자와의 직접적인 연결선 없이 포털이나 SNS의 광고 알고리즘에 종속된다. 양질의 콘텐츠를 만들어도 플랫폼이 수익을 독점.",
      solution:
        "누구나 이메일 뉴스레터를 발행하고 독자로부터 직접 정기 구독료를 받을 수 있는 퍼블리싱 플랫폼. 결제, 발송, 호스팅을 원스톱으로 제공.",
      initialWedge:
        "트위터에서 팬덤을 확보했지만 수익화에 목말라 있던 기술/문화 분야의 니치(Niche) 오피니언 리더들 타겟팅. 초기 10명의 스타 작가를 직접 리크루팅.",
      unfairAdvantage:
        "결제, 이메일 발송, 웹 호스팅 등 기술적 인프라를 완전히 숨겨 작가는 '글쓰기'에만 집중하게 하는 극강의 심플함. 작가의 구독자 리스트는 작가 소유(이식 가능).",
      revenueUnitEconomics:
        "작가가 설정한 유료 구독 매출의 10%를 플랫폼 수수료로 수취. 상위 작가는 연 수백만 달러 수익. 플랫폼 전체 유료 구독자 300만+ 명.",
      signatureMoves:
        "Substack Pro 프로그램 — NYT 등 기성 언론의 스타 기자들에게 수억 원의 선급금을 쥐여주며 데려와 그들의 거대한 팬덤을 플랫폼으로 이주시키는 공격적 인재 영입.",
    },
  },
  {
    meta: {
      companyName: "Roblox",
      industry: "Metaverse/Gaming Platform",
      foundedYear: 2004,
      fundingStage: "Post-IPO",
      revenueModel: "Virtual Currency",
      targetMarket: "B2C",
    },
    deepAnalysis: {
      problem:
        "아이들은 또래가 만든 엉뚱하고 재미있는 게임을 원하지만, 게임 개발 엔진(Unity, Unreal)은 너무 전문가용이다. 소비만 가능하고 창작은 불가능한 구조.",
      solution:
        "초보자도 레고 조립하듯 쉽게 다룰 수 있는 3D 스튜디오 엔진과, 원클릭으로 배포해 친구들과 노는 소셜 플랫폼의 결합. 게임 = 놀이터 = 소셜 공간.",
      initialWedge:
        "코딩에 관심 있는 10대 초중반 아이들이 친구들을 골탕 먹이는 단순한 '장애물 피하기(Obby)' 맵을 만들면서 시작. 학교 급식 시간에 친구에게 '내가 만든 게임 해봐'라며 바이럴.",
      unfairAdvantage:
        "수백만 명의 어린 창작자들이 자발적으로 무료 콘텐츠를 매일 쏟아내는 사용자 제작 콘텐츠(UGC) 플라이휠. Roblox 자체는 게임 하나 만들지 않고도 콘텐츠가 무한 증식.",
      revenueUnitEconomics:
        "유저가 가상 화폐(Robux)를 구매해 아이템 결제. 플랫폼이 약 70%를 떼고 크리에이터에게 30% 수준 정산. 2023년 매출 $27억, DAU 7,000만+.",
      signatureMoves:
        "단순한 게임 플레이가 아닌 '공동 경험(Co-experience)'. 게임 접속이 곧 방과 후 놀이터에서 친구들과 수다 떨며 노는 공간적 역할을 대체. 브랜드 콜라보(Nike, Gucci)로 메타버스 상거래 개척.",
    },
  },
  {
    meta: {
      companyName: "Deel",
      industry: "HR Tech / EOR",
      foundedYear: 2019,
      fundingStage: "Late Stage",
      revenueModel: "SaaS Subscription",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "스타트업이 해외에 있는 우수 인재를 고용하려면 각국의 복잡한 노동법, 세금, 급여 송금 규제를 뚫어야 한다. 법인이 없는 나라의 인재는 사실상 채용 불가.",
      solution:
        "Deel이 각국에 세워둔 법인으로 인재를 대신 고용·파견하는 형태(EOR)의 글로벌 통합 급여/컴플라이언스 플랫폼. 클릭 몇 번으로 150개국 인재 합법 고용.",
      initialWedge:
        "원격 근무가 폭발한 팬데믹 시기, 실리콘밸리 밖의 저렴하고 우수한 개발자를 즉시 고용하고 싶어 하는 Y Combinator 동문 스타트업들. YC 배치 네트워크가 초기 고객 파이프라인.",
      unfairAdvantage:
        "빠른 속도로 전 세계 100개 이상의 국가에 직접 법인을 설립하고 법률망을 구축하여 후발 주자가 따라오기 힘든 물리적/법적 진입 장벽 형성. $120억 밸류에이션의 자본력.",
      revenueUnitEconomics:
        "정규직 직원(EOR)은 1인당 월 $599, 계약직은 월 $49의 고정 수수료 과금. 대기업 엔터프라이즈 딜은 별도 견적. 2023년 ARR $5억+ 추정.",
      signatureMoves:
        "최근 투자 유치를 받아 '채용 자금'이 넉넉해진 스타트업들의 뉴스 기사를 트래킹하여 집중적으로 아웃바운드 세일즈를 거는 타이밍 마케팅. Rippling, Remote 등과의 치열한 '브랜드 전쟁'.",
    },
  },
  {
    meta: {
      companyName: "Loom",
      industry: "Async Video SaaS",
      foundedYear: 2015,
      fundingStage: "Acquired",
      revenueModel: "Freemium Subscription",
      targetMarket: "B2B",
    },
    deepAnalysis: {
      problem:
        "간단한 피드백이나 설명을 위해 30분짜리 실시간 미팅을 잡아야 한다. 미팅 과잉으로 '실제 업무 시간'이 줄어드는 비동기 커뮤니케이션 수단의 부재.",
      solution:
        "화면 + 얼굴을 동시에 녹화해 링크 하나로 공유하는 비동기 비디오 메시지 도구. 받는 사람은 편한 시간에 1.5배속으로 시청하고 타임스탬프별 댓글로 피드백.",
      initialWedge:
        "원격 근무 팀의 PM과 디자이너를 타겟. '이 화면 녹화해서 보내면 미팅 하나 줄일 수 있다'는 즉각적 가치 제안. Product Hunt 1위로 초기 유입 폭발.",
      unfairAdvantage:
        "브라우저 확장 프로그램 하나로 녹화~공유까지 10초 완료되는 극한의 마찰 제거. 경쟁사(Vidyard 등) 대비 압도적으로 낮은 진입 장벽. Atlassian이 $9.75억에 인수.",
      revenueUnitEconomics:
        "5분 이내 녹화 무료, 무제한 녹화 + 분석 기능 포함 비즈니스 플랜 1인당 월 $12.50. PLG 모델로 팀 내 1명이 쓰면 동료에게 자연 확산.",
      signatureMoves:
        "녹화 영상 링크를 받은 사람이 '이게 뭐지?' 하고 열어보면서 자연스럽게 Loom을 알게 되는 PLG 바이럴. 미팅 취소 → Loom으로 대체하는 문화적 무브먼트('이건 Loom이면 되는데?').",
    },
  },
];

// ─────────────────────────────────────────────────────────────
// deepAnalysis → 임베딩용 텍스트 결합
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// 콘솔 유틸
// ─────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const BAR = "=".repeat(62);

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────

async function main() {
  const upsertCase = await loadUpsertCase();

  console.log(`\n${BAR}`);
  console.log("  Widea - Global Startup Case Seeder (Dummy)");
  console.log(BAR);
  console.log(`  Mode    : ${upsertCase ? "PostgreSQL + Pinecone" : "PostgreSQL ONLY (Pinecone skipped)"}`);
  console.log(`  Total   : ${STARTUPS.length} companies\n`);

  const results: { name: string; vectorDbId: string; ok: boolean }[] = [];

  for (const [idx, startup] of STARTUPS.entries()) {
    const step = idx + 1;
    const { meta, deepAnalysis } = startup;
    console.log(`  [${step}/${STARTUPS.length}] ${meta.companyName}`);

    try {
      const vectorDbId = randomUUID();
      const textContent = buildCaseEmbeddingText({
        companyName: meta.companyName,
        industry: meta.industry,
        revenueModel: meta.revenueModel,
        targetMarket: meta.targetMarket,
        problemStatement: deepAnalysis.problem,
        solutionCore: deepAnalysis.solution,
        initialWedge: deepAnalysis.initialWedge,
        unfairAdvantage: deepAnalysis.unfairAdvantage,
        unitEconomics: deepAnalysis.revenueUnitEconomics,
        signatureMoves: deepAnalysis.signatureMoves,
      });

      // ── Pinecone (선택적) ──
      if (upsertCase) {
        await upsertCase(textContent, {
          dbId: vectorDbId,
          companyName: meta.companyName,
          businessModel: meta.revenueModel,
          targetMarket: meta.targetMarket,
        });
        console.log(`         Pinecone  OK  (${vectorDbId.slice(0, 8)}...)`);
      }

      // ── PostgreSQL: GlobalCaseMeta + GlobalCaseDeepAnalysis ──
      const caseMeta = await prisma.globalCaseMeta.upsert({
        where: { vectorDbId },
        update: {
          companyName: meta.companyName,
          industry: meta.industry,
          foundedYear: meta.foundedYear,
          fundingStage: meta.fundingStage,
          revenueModel: meta.revenueModel,
          targetMarket: meta.targetMarket, // V2 추가
        },
        create: {
          vectorDbId,
          companyName: meta.companyName,
          industry: meta.industry,
          foundedYear: meta.foundedYear,
          fundingStage: meta.fundingStage,
          revenueModel: meta.revenueModel,
          targetMarket: meta.targetMarket, // V2 추가
        },
      });

      // ── GlobalCaseDeepAnalysis 저장 또는 업데이트 ──
      await prisma.globalCaseDeepAnalysis.upsert({
        where: { globalCaseMetaId: caseMeta.id },
        update: {
          problemStatement: deepAnalysis.problem,
          solutionCore: deepAnalysis.solution,
          initialWedge: deepAnalysis.initialWedge,
          unfairAdvantage: deepAnalysis.unfairAdvantage,
          unitEconomics: deepAnalysis.revenueUnitEconomics,
          signatureMoves: deepAnalysis.signatureMoves,
        },
        create: {
          globalCaseMetaId: caseMeta.id,
          problemStatement: deepAnalysis.problem,
          solutionCore: deepAnalysis.solution,
          initialWedge: deepAnalysis.initialWedge,
          unfairAdvantage: deepAnalysis.unfairAdvantage,
          unitEconomics: deepAnalysis.revenueUnitEconomics,
          signatureMoves: deepAnalysis.signatureMoves,
        },
      });

      console.log(`         Postgres  OK  | ${meta.industry} | ${meta.targetMarket}`);

      results.push({ name: meta.companyName, vectorDbId, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`         FAILED: ${msg}`);
      results.push({ name: meta.companyName, vectorDbId: "-", ok: false });
    }

    // Rate Limit 방지 (Pinecone 활성 시에만 의미 있지만, 안전하게 항상 적용)
    if (step < STARTUPS.length) {
      await delay(upsertCase ? 2000 : 100);
    }
  }

  // ── 최종 결과 ──
  console.log(`\n${BAR}`);
  console.log("  Results");
  console.log(BAR);
  console.log(`  ${"Company".padEnd(16)} ${"VectorDB ID".padEnd(38)} Status`);
  console.log(`  ${"-".repeat(16)} ${"-".repeat(38)} ------`);
  for (const r of results) {
    const id = r.ok ? r.vectorDbId : "-".repeat(36);
    console.log(`  ${r.name.padEnd(16)} ${id.padEnd(38)} ${r.ok ? "OK" : "FAIL"}`);
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n  ${okCount}/${results.length} succeeded`);
  console.log(`\n${BAR}`);
  console.log("  SEED COMPLETE");
  console.log(`${BAR}\n`);
}

main()
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
