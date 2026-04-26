/**
 * enrich_cases.ts — 글로벌 스타트업 케이스 AI 심층 보강 스크립트
 *
 * 동작:
 * 1. deepAnalysis가 없거나 dataQualityScore < 80인 케이스 batch 조회
 * 2. Tavily API로 회사 관련 실제 기사/정보 웹 검색 (컨텍스트 수집)
 * 3. Gemini 2.5 Flash에게 실제 검색 결과를 근거로 12개 JSON 블록 전체 생성
 *    (growthStory, technologyDNA, founderDNA, koreaStrategy, replicationGuide,
 *     marketTiming, competitiveLandscape, revenueDeepDive, networkEffects,
 *     expansionPlaybook, investorPOV + 기존 텍스트 6개 필드)
 * 4. GlobalCaseDeepAnalysis upsert + GlobalCaseMeta.dataQualityScore 업데이트
 * 5. Pinecone에 고품질 임베딩으로 재업서트
 * 6. Rate limiting: 2000ms 간격 (Gemini API quota 보호)
 *
 * 사용:
 *   npm run enrich_cases
 *   ENRICH_LIMIT=50 npm run enrich_cases   (처음 N개만)
 *   FORCE_REENRICH=1 npm run enrich_cases   (이미 보강된 것도 재생성)
 *
 * 필요 환경변수:
 *   GEMINI_API_KEY   — Gemini 2.5 Flash 분석 생성
 *   TAVILY_API_KEY   — 웹 검색 컨텍스트 수집 (없으면 검색 스킵)
 */

import "dotenv/config";
import { PrismaClient, type DifficultyLevel } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildCaseEmbeddingText } from "../src/lib/caseEmbedding.js";

const BAR = "─".repeat(72);

type UpsertCaseFn = typeof import("../src/lib/vectorDb.js").upsertCase;

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const gemini = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// ─────────────────────────────────────────────────────────────────────────────
// Tavily 웹 검색 — 회사 실제 정보 수집
// ─────────────────────────────────────────────────────────────────────────────

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function fetchCompanyContext(companyName: string, industry: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return ""; // 키 없으면 스킵 (AI 학습 지식만 사용)

  try {
    const query = `${companyName} startup ${industry} business model growth strategy funding`;
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        max_results: 5,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!res.ok) return "";

    const data = await res.json() as { answer?: string; results: TavilyResult[] };

    // 검색 결과를 텍스트로 압축
    const sections: string[] = [];
    if (data.answer) sections.push(`[Summary] ${data.answer}`);
    for (const r of data.results.slice(0, 4)) {
      sections.push(`[${r.title}]\n${r.content.slice(0, 600)}`);
    }
    return sections.join("\n\n");
  } catch {
    return ""; // 검색 실패 시 AI 학습 지식으로 폴백
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini 생성 + 재시도
// ─────────────────────────────────────────────────────────────────────────────
async function generateWithRetry(prompt: string, maxRetries = 3): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await gemini.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        const waitMs = 3_000 * (attempt + 1);
        console.log(`\n  ⏳ 재시도 (${attempt + 1}/${maxRetries}) → ${waitMs / 1000}초 대기... (${msg.slice(0, 60)})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("최대 재시도 횟수 초과");
}

const ENRICH_LIMIT = process.env.ENRICH_LIMIT ? parseInt(process.env.ENRICH_LIMIT) : undefined;
const FORCE_REENRICH = process.env.FORCE_REENRICH === "1";
const QUALITY_THRESHOLD = 80; // 이 점수 미만은 재보강 대상

// ─────────────────────────────────────────────────────────────────────────────
// AI 생성 프롬프트
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(
  companyName: string,
  industry: string,
  revenueModel: string | null,
  foundedYear: number | null,
  geographicOrigin: string | null,
  targetMarket: string | null,
  existingAnalysis: {
    problemStatement?: string | null;
    solutionCore?: string | null;
    initialWedge?: string | null;
    unfairAdvantage?: string | null;
    unitEconomics?: string | null;
    signatureMoves?: string | null;
  } | null,
  webContext: string
): string {
  const existing = existingAnalysis
    ? `
기존 분석 데이터 (참고용):
- 핵심 문제: ${existingAnalysis.problemStatement ?? "없음"}
- 솔루션: ${existingAnalysis.solutionCore ?? "없음"}
- 초기 전략: ${existingAnalysis.initialWedge ?? "없음"}
- 경쟁우위: ${existingAnalysis.unfairAdvantage ?? "없음"}
- 수익구조: ${existingAnalysis.unitEconomics ?? "없음"}
- 성장 트리거: ${existingAnalysis.signatureMoves ?? "없음"}
`
    : "";

  const contextSection = webContext
    ? `
실제 웹 검색 결과 (이 정보를 근거로 분석하세요. 할루시네이션 금지):
─────────────────────────────────────────
${webContext.slice(0, 1500)}
─────────────────────────────────────────
`
    : "";

  return `You are a world-class startup analyst with deep expertise in Korean market entry strategy.
Analyze the following global startup and return a comprehensive JSON response in Korean.

Company: ${companyName}
Industry: ${industry}
Revenue Model: ${revenueModel ?? "Unknown"}
Founded: ${foundedYear ?? "Unknown"}
Origin: ${geographicOrigin ?? "Unknown"}
Target Market: ${targetMarket ?? "Unknown"}
${contextSection}${existing}

Return ONLY a valid JSON object with these exact keys (all values in Korean):

{
  "problemStatement": "창업자가 해결하려 했던 핵심 문제 (2~4문장, 구체적 수치 포함)",
  "solutionCore": "기술/UX/운영 관점의 핵심 솔루션 설명",
  "initialWedge": "초기 첫 고객 100명 확보 전략, 구체적 타겟팅 방법",
  "unfairAdvantage": "경쟁사가 단기간에 복제하기 어려운 핵심 우위 (Moat)",
  "unitEconomics": "CAC, LTV, 가격 구조, ARR 수치 포함 수익 단위 경제학",
  "signatureMoves": "핵심 성장 트리거 / 게임체인저 전략 (3가지 이상)",
  "koreaAdaptNotes": "한국 시장 적용 시 알려진 이슈 및 성공 포인트 요약",

  "shortDescription": "서비스를 한 문장으로 (50자 이내)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "difficultyLevel": "EASY|MEDIUM|HARD|EXPERT",
  "minCapitalKRW": 50000000,
  "targetMarket": "B2B|B2C|B2B2C",
  "geographicOrigin": "US|EU|SEA|KR|LATAM|AFRICA|MENA|ANZ",
  "teamSizeAtLaunch": 3,

  "growthStory": {
    "first100Customers": "첫 100명 고객 확보 방법 (구체적 전술)",
    "first1000Customers": "1000명 돌파 전략 (채널, 캠페인, 파트너십)",
    "keyInflectionPoints": ["202X년: ~으로 MAU N배 성장", "202X년: ~으로 수익 흑자 전환"],
    "productEvolution": "제품 v1 → 현재까지 진화 타임라인",
    "failuresAndPivots": "겪었던 주요 실패 및 피벗 경험",
    "viralMechanism": "바이럴/입소문 메커니즘 (PLG, 추천 등)",
    "channelBreakdown": "채널별 성장 기여도 (예: SEO 40%, 추천 30%, 유료광고 30%)"
  },

  "technologyDNA": {
    "coreTechStack": "핵심 기술 스택 및 인프라",
    "dataAdvantage": "보유 데이터 자산 및 데이터 우위",
    "platformStrategy": "플랫폼/API/생태계 전략",
    "keyIntegrations": ["핵심 외부 연동 1", "핵심 외부 연동 2"],
    "techDifferentiator": "기술적 해자 요약 (한 문장)",
    "aiUsage": "AI/ML 활용 방식 (없으면 '해당 없음')"
  },

  "founderDNA": {
    "founderBackgrounds": "주요 창업자 경력 및 도메인 경험",
    "whyFounders": "왜 이 창업자들이 이 문제를 풀기에 적임인가",
    "criticalSkills": ["반드시 필요한 역량1", "역량2", "역량3"],
    "gameChangingHires": "궤도를 바꾼 핵심 채용 사례",
    "founderMarketFit": "창업자와 해결 시장 간의 적합성 분석",
    "teamCulture": "팀 문화 및 운영 방식"
  },

  "koreaStrategy": {
    "marketSizeEstKRW": "한국 TAM 추정 (예: '약 2조 원 규모')",
    "localCompetitors": ["국내 경쟁사1 (차이점)", "국내 경쟁사2 (차이점)"],
    "directAdaptable": ["한국에서 그대로 쓸 수 있는 전략1", "전략2"],
    "mustChange": ["반드시 바꿔야 할 것1 (이유)", "바꿀 것2 (이유)"],
    "regulatoryBarriers": ["규제/인허가 장벽1", "장벽2"],
    "culturalInsights": "한국 특유 문화적 고려사항 (정서, 관계, UX 등)",
    "partnershipTargets": ["전략적 파트너 후보1", "파트너 후보2"],
    "successScore": 75,
    "successScoreReason": "점수 산정 근거 (규제/경쟁/문화 적합성 종합)",
    "bestLaunchCity": "한국 내 최적 첫 런칭 도시 또는 채널"
  },

  "replicationGuide": {
    "minCapitalKRW": 50000000,
    "idealCapitalKRW": 200000000,
    "minTeamSize": 3,
    "idealTeamComposition": ["CTO (풀스택)", "마케터", "도메인 전문가"],
    "monthsToMVP": 3,
    "monthsToRevenue": 6,
    "keyDependencies": ["필수 파트너십/API/라이선스1", "의존성2"],
    "criticalSuccessFactors": ["성공의 절대 조건1", "조건2", "조건3"],
    "commonFailureModes": ["흔한 실패 패턴1", "패턴2"],
    "difficultyScore": 6,
    "difficultyReason": "난이도 판단 근거 (기술/규제/자본 관점)"
  },

  "marketTiming": {
    "enablingMacroTrend": "이 사업을 가능하게 한 메가트렌드",
    "whyThisTiming": "왜 이 시점(창업 연도)이었는가",
    "precedentFailures": "이전에 실패한 유사 시도들",
    "futureThreat": "미래 위협 요인 (기술 변화, 규제, 신규 진입자)",
    "opportunityWindow": "기회 창이 얼마나 남았는가",
    "koreaTimingNote": "한국 기준 현재 타이밍 평가 (이미 늦었나 / 아직 기회가 있나)"
  },

  "competitiveLandscape": {
    "directCompetitors": [{"name": "경쟁사명", "weakness": "이 회사 대비 약점"}],
    "indirectCompetitors": ["간접 경쟁사1", "간접 경쟁사2"],
    "competitivePositioning": "경쟁 포지셔닝 전략 (어떻게 차별화하는가)",
    "moatStrength": "WEAK|MODERATE|STRONG|FORTRESS",
    "defensibility": "해자 방어력 상세 설명",
    "blueOceanElements": "블루오션 요소 (경쟁 없는 가치 창출)"
  },

  "revenueDeepDive": {
    "primaryStream": "주요 수익원",
    "secondaryStreams": ["보조 수익원1", "보조 수익원2"],
    "pricingStrategy": "가격 전략 (Freemium/Usage-based/Seat-based 등)",
    "estimatedCAC": "추정 고객 획득 비용 (예: '$50-200')",
    "estimatedLTV": "추정 고객 생애 가치 (예: '$500-2000')",
    "ltvCacRatio": "LTV/CAC 비율 (예: '3:1')",
    "estimatedGrossMargin": "추정 총이익률 (예: '70-80%')",
    "paybackPeriod": "투자 회수 기간 (예: '12-18개월')",
    "unitEconomicsHealth": "POOR|FAIR|GOOD|EXCELLENT",
    "koreaPricingAdapt": "한국 시장 가격 적용 방안"
  },

  "networkEffects": {
    "hasNetworkEffect": true,
    "effectType": "DIRECT|INDIRECT|DATA|PLATFORM|NONE",
    "flywheel": "플라이휠 메커니즘 설명 (A → B → C → A 순환)",
    "lockInMechanism": "고착 메커니즘 (왜 떠나기 어려운가)",
    "switchingCosts": "HIGH|MEDIUM|LOW",
    "dataNetwork": "데이터 네트워크 효과 (데이터가 쌓일수록 서비스가 좋아지는 구조)"
  },

  "expansionPlaybook": {
    "expansionOrder": ["1차: 미국 내 특정 도시", "2차: 영어권", "3차: 유럽"],
    "localizationStrategy": "현지화 전략 (언어/문화/결제/규제 대응)",
    "geoAdaptations": "지역별 핵심 변경사항",
    "failedMarkets": ["실패한 시장1 (이유)", "실패한 시장2 (이유)"],
    "expansionLessons": "확장 과정에서 배운 것",
    "asiaStrategy": "아시아 시장 전략 (한국 진출 참고용)"
  },

  "investorPOV": {
    "keyMetrics": ["투자자가 추적한 핵심 지표1", "지표2", "지표3"],
    "narrativeArc": "펀딩 스토리 (어떤 비전을 어떻게 팔았나)",
    "notableInvestors": ["주요 투자자/기관1", "투자자2"],
    "valuationDrivers": "밸류에이션 근거 (무엇이 가치를 만들었나)",
    "investorRedFlags": "투자자가 우려했던 리스크와 해소 방법",
    "exitStrategy": "예상 또는 실제 엑싯 전략 (IPO/M&A 등)",
    "koreanVCAppeal": "한국 VC에게 어필할 포인트"
  }
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON 파싱
// ─────────────────────────────────────────────────────────────────────────────

// Prisma InputJsonValue 호환 타입
type JsonObj = { [key: string]: string | number | boolean | null | JsonObj | (string | number | boolean | null | JsonObj)[] };

interface EnrichResult {
  problemStatement: string;
  solutionCore: string;
  initialWedge: string;
  unfairAdvantage: string;
  unitEconomics: string;
  signatureMoves: string;
  koreaAdaptNotes: string;
  shortDescription: string;
  tags: string[];
  difficultyLevel: DifficultyLevel;
  minCapitalKRW: number;
  targetMarket: "B2B" | "B2C" | "B2B2C";
  geographicOrigin: string;
  teamSizeAtLaunch: number;
  growthStory: JsonObj;
  technologyDNA: JsonObj;
  founderDNA: JsonObj;
  koreaStrategy: JsonObj;
  replicationGuide: JsonObj;
  marketTiming: JsonObj;
  competitiveLandscape: JsonObj;
  revenueDeepDive: JsonObj;
  networkEffects: JsonObj;
  expansionPlaybook: JsonObj;
  investorPOV: JsonObj;
}

function parseResponse(raw: string): EnrichResult | null {
  try {
    // Gemini thinking 블록 제거 (<thinking>...</thinking>)
    let cleaned = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();

    // 마크다운 코드 블록 제거
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // JSON 객체만 추출 (앞뒤 텍스트 제거)
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(cleaned);
    if (!parsed.problemStatement || !parsed.solutionCore) return null;
    return parsed as EnrichResult;
  } catch (e) {
    if (process.env.DEBUG_PARSE) {
      console.error("\n[DEBUG] raw (first 500):", raw.slice(0, 500));
      console.error("[DEBUG] parse error:", e);
    }
    return null;
  }
}

// AI가 String 필드를 배열로 반환할 경우 문자열로 변환
function toStr(v: unknown): string {
  if (Array.isArray(v)) return v.join("\n");
  return String(v ?? "");
}

function calcQualityScore(result: EnrichResult): number {
  // 텍스트 필드 품질: 각 50자 이상이어야 의미있는 내용으로 판단
  const textFields = [
    result.problemStatement, result.solutionCore, result.initialWedge,
    result.unfairAdvantage, result.unitEconomics, result.signatureMoves,
  ];
  const filledText = textFields.filter((t) => t && t.length >= 50).length;

  // JSON 블록 품질 검사
  const jsonBlockScores: number[] = [];

  // koreaStrategy: localCompetitors에 실제 회사명 있는지 (숫자/한글 포함 15자 이상)
  const ks = result.koreaStrategy as Record<string, unknown>;
  const ksScore = (() => {
    if (!ks || !Array.isArray(ks.localCompetitors)) return 0;
    const hasRealCompetitors = (ks.localCompetitors as string[]).some((c) => c.length >= 15 && !c.includes("경쟁사1") && !c.includes("경쟁사2"));
    const hasRealMarketSize = typeof ks.marketSizeEstKRW === "string" && ks.marketSizeEstKRW.length >= 5;
    const hasTimingNote = typeof ks.koreaTimingNote === "string" && (ks.koreaTimingNote as string).length >= 30;
    return (hasRealCompetitors ? 1 : 0) + (hasRealMarketSize ? 1 : 0) + (hasTimingNote ? 1 : 0);
  })();
  jsonBlockScores.push(ksScore / 3);

  // replicationGuide: 구체적 수치 있는지
  const rg = result.replicationGuide as Record<string, unknown>;
  const rgScore = (() => {
    if (!rg) return 0;
    const hasCapital = typeof rg.minCapitalKRW === "number" && (rg.minCapitalKRW as number) > 0;
    const hasMVP = typeof rg.monthsToMVP === "number";
    const hasFailures = Array.isArray(rg.commonFailureModes) && (rg.commonFailureModes as string[]).some((f) => (f as string).length >= 20);
    return (hasCapital ? 1 : 0) + (hasMVP ? 1 : 0) + (hasFailures ? 1 : 0);
  })();
  jsonBlockScores.push(rgScore / 3);

  // growthStory: 구체적 전략 있는지
  const gs = result.growthStory as Record<string, unknown>;
  const gsScore = (() => {
    if (!gs) return 0;
    const hasFirst100 = typeof gs.first100Customers === "string" && (gs.first100Customers as string).length >= 40;
    const hasViral = typeof gs.viralMechanism === "string" && (gs.viralMechanism as string).length >= 20;
    const hasInflection = Array.isArray(gs.keyInflectionPoints) && (gs.keyInflectionPoints as string[]).length >= 2;
    return (hasFirst100 ? 1 : 0) + (hasViral ? 1 : 0) + (hasInflection ? 1 : 0);
  })();
  jsonBlockScores.push(gsScore / 3);

  // 나머지 블록: 단순 존재 + 최소 길이 체크
  const otherBlocks = [
    result.technologyDNA, result.founderDNA, result.marketTiming,
    result.competitiveLandscape, result.revenueDeepDive, result.networkEffects,
    result.expansionPlaybook, result.investorPOV,
  ];
  const filledOther = otherBlocks.filter((b) => {
    if (!b || Object.keys(b).length === 0) return false;
    return JSON.stringify(b).length >= 200;
  }).length;
  jsonBlockScores.push(filledOther / 8);

  const avgJsonScore = jsonBlockScores.reduce((a, b) => a + b, 0) / jsonBlockScores.length;
  return Math.round(avgJsonScore * 70 + (filledText / 6) * 30);
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + BAR);
  console.log("  Widea — Global Case AI Enricher (Full 11-Block Mode)");
  console.log(BAR);

  // Pinecone 선택적 로드
  let upsertCase: UpsertCaseFn | null = null;
  if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
    const mod = await import("../src/lib/vectorDb.js");
    upsertCase = mod.upsertCase;
    console.log("  Pinecone: 활성화됨 (임베딩 재업서트 포함)");
  } else {
    console.log("  Pinecone: 비활성화 (PostgreSQL만 업데이트)");
  }

  // 보강 대상 케이스 조회
  const whereClause = FORCE_REENRICH
    ? {}
    : {
        OR: [
          { deepAnalysis: null },
          { dataQualityScore: { lt: QUALITY_THRESHOLD } },
        ],
      };

  const candidates = await prisma.globalCaseMeta.findMany({
    where: whereClause,
    include: { deepAnalysis: true },
    orderBy: { createdAt: "asc" },
    ...(ENRICH_LIMIT ? { take: ENRICH_LIMIT } : {}),
  });

  const total = await prisma.globalCaseMeta.count();
  console.log(`  전체 케이스: ${total}개`);
  console.log(`  보강 대상:   ${candidates.length}개`);
  console.log(`  임계 품질:   ${QUALITY_THRESHOLD}점 (FORCE=${FORCE_REENRICH})`);
  console.log(BAR + "\n");

  if (candidates.length === 0) {
    console.log("✅ 모든 케이스가 이미 보강되어 있습니다.");
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const num = `[${i + 1}/${candidates.length}]`;

    process.stdout.write(`${num} ${c.companyName} ... `);

    try {
      // 웹 검색으로 실제 컨텍스트 수집
      const webContext = await fetchCompanyContext(c.companyName, c.industry);
      if (webContext) process.stdout.write(`[웹검색 완료] `);

      const prompt = buildPrompt(
        c.companyName,
        c.industry,
        c.revenueModel,
        c.foundedYear,
        c.geographicOrigin,
        c.targetMarket,
        c.deepAnalysis
          ? {
              problemStatement: c.deepAnalysis.problemStatement,
              solutionCore:     c.deepAnalysis.solutionCore,
              initialWedge:     c.deepAnalysis.initialWedge,
              unfairAdvantage:  c.deepAnalysis.unfairAdvantage,
              unitEconomics:    c.deepAnalysis.unitEconomics,
              signatureMoves:   c.deepAnalysis.signatureMoves,
            }
          : null,
        webContext
      );

      const rawText = await generateWithRetry(prompt);
      const result = parseResponse(rawText);

      if (!result) {
        process.stdout.write("⚠ JSON 파싱 실패\n");
        failed++;
        continue;
      }

      const qualityScore = calcQualityScore(result);

      // DeepAnalysis upsert
      await prisma.globalCaseDeepAnalysis.upsert({
        where: { globalCaseMetaId: c.id },
        create: {
          globalCaseMetaId: c.id,
          problemStatement: toStr(result.problemStatement),
          solutionCore:     toStr(result.solutionCore),
          initialWedge:     toStr(result.initialWedge),
          unfairAdvantage:  toStr(result.unfairAdvantage),
          unitEconomics:    toStr(result.unitEconomics),
          signatureMoves:   toStr(result.signatureMoves),
          koreaAdaptNotes:  toStr(result.koreaAdaptNotes),
          growthStory:          result.growthStory,
          technologyDNA:        result.technologyDNA,
          founderDNA:           result.founderDNA,
          koreaStrategy:        result.koreaStrategy,
          replicationGuide:     result.replicationGuide,
          marketTiming:         result.marketTiming,
          competitiveLandscape: result.competitiveLandscape,
          revenueDeepDive:      result.revenueDeepDive,
          networkEffects:       result.networkEffects,
          expansionPlaybook:    result.expansionPlaybook,
          investorPOV:          result.investorPOV,
        },
        update: {
          problemStatement: toStr(result.problemStatement),
          solutionCore:     toStr(result.solutionCore),
          initialWedge:     toStr(result.initialWedge),
          unfairAdvantage:  toStr(result.unfairAdvantage),
          unitEconomics:    toStr(result.unitEconomics),
          signatureMoves:   toStr(result.signatureMoves),
          koreaAdaptNotes:  toStr(result.koreaAdaptNotes),
          growthStory:          result.growthStory,
          technologyDNA:        result.technologyDNA,
          founderDNA:           result.founderDNA,
          koreaStrategy:        result.koreaStrategy,
          replicationGuide:     result.replicationGuide,
          marketTiming:         result.marketTiming,
          competitiveLandscape: result.competitiveLandscape,
          revenueDeepDive:      result.revenueDeepDive,
          networkEffects:       result.networkEffects,
          expansionPlaybook:    result.expansionPlaybook,
          investorPOV:          result.investorPOV,
        },
      });

      // targetMarket enum 안전 매핑
      const tmMap: Record<string, "B2B" | "B2C" | "B2B2C"> = { B2B: "B2B", B2C: "B2C", B2B2C: "B2B2C" };
      const enrichedTargetMarket = tmMap[result.targetMarket] ?? null;

      // Meta 업데이트 (항상 덮어쓰기 — enrich로 품질 높은 값으로 갱신)
      await prisma.globalCaseMeta.update({
        where: { id: c.id },
        data: {
          shortDescription: result.shortDescription ?? undefined,
          tags:             result.tags ?? undefined,
          difficultyLevel:  result.difficultyLevel ?? undefined,
          minCapitalKRW:    result.minCapitalKRW ? BigInt(result.minCapitalKRW) : undefined,
          dataQualityScore: qualityScore,
          ...(enrichedTargetMarket ? { targetMarket: enrichedTargetMarket } : {}),
          ...(result.geographicOrigin ? { geographicOrigin: result.geographicOrigin } : {}),
          ...(result.teamSizeAtLaunch ? { teamSizeAtLaunch: result.teamSizeAtLaunch } : {}),
        },
      });

      // Pinecone 재업서트 (활성화된 경우)
      if (upsertCase) {
        const textContent = buildCaseEmbeddingText({
          companyName:          c.companyName,
          industry:             c.industry,
          revenueModel:         c.revenueModel,
          targetMarket:         c.targetMarket,
          foundedYear:          c.foundedYear,
          fundingStage:         c.fundingStage,
          geographicOrigin:     c.geographicOrigin,
          targetCustomerProfile: c.targetCustomerProfile,
          shortDescription:     result.shortDescription,
          tags:                 result.tags,
          problemStatement:     result.problemStatement,
          solutionCore:         result.solutionCore,
          initialWedge:         result.initialWedge,
          unfairAdvantage:      result.unfairAdvantage,
          unitEconomics:        result.unitEconomics,
          signatureMoves:       result.signatureMoves,
          koreaAdaptNotes:      result.koreaAdaptNotes,
          growthStory:          result.growthStory,
          technologyDNA:        result.technologyDNA,
          founderDNA:           result.founderDNA,
          koreaStrategy:        result.koreaStrategy,
          replicationGuide:     result.replicationGuide,
          marketTiming:         result.marketTiming,
          competitiveLandscape: result.competitiveLandscape,
          revenueDeepDive:      result.revenueDeepDive,
          networkEffects:       result.networkEffects,
          expansionPlaybook:    result.expansionPlaybook,
          investorPOV:          result.investorPOV,
        });

        await upsertCase(textContent, {
          dbId:          c.vectorDbId,
          companyName:   c.companyName,
          businessModel: c.revenueModel ?? "N/A",
          targetMarket:  c.targetMarket ?? "B2C",
        });
      }

      process.stdout.write(`✅ (품질: ${qualityScore}점)\n`);
      success++;

      if ((i + 1) % 10 === 0) {
        console.log(`\n  📊 중간 집계: ${success}성공 / ${failed}실패 / ${i + 1}/${candidates.length}\n`);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`❌ \n`);
      console.error("  상세 에러:", msg);
      failed++;
    }

    // Gemini 무료 티어: 분당 15req → 4초 간격
    if (i < candidates.length - 1) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  console.log("\n" + BAR);
  console.log(`  완료: ✅ ${success}건 성공  ❌ ${failed}건 실패`);
  const finalCount = await prisma.globalCaseMeta.count({ where: { dataQualityScore: { gte: QUALITY_THRESHOLD } } });
  console.log(`  품질 ${QUALITY_THRESHOLD}점 이상: ${finalCount}건`);
  console.log(BAR + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Script failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
