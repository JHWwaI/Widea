import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "node:crypto";

// ─────────────────────────────────────────────────────────────
// 환경 변수 검증
// ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}

// ─────────────────────────────────────────────────────────────
// 클라이언트 초기화
// ─────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const generationModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 1.0,
  },
});

// vectorDb 동적 로드 (Pinecone 환경 변수가 모두 있을 때만)
type UpsertCaseFn = typeof import("../src/lib/vectorDb.js").upsertCase;

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
// 타입 정의
// ─────────────────────────────────────────────────────────────

interface NicheStartup {
  companyName: string;
  industry: string;
  foundedYear: number;
  fundingStage: string;
  revenueModel: string;
  targetMarket: string;
  geographicOrigin: string;
  teamSizeAtLaunch: number;
  problem: string;
  solution: string;
  initialWedge: string;
  unfairAdvantage: string;
  revenueUnitEconomics: string;
  signatureMoves: string;
}

// ─────────────────────────────────────────────────────────────
// Gemini 프롬프트
// ─────────────────────────────────────────────────────────────

function buildPrompt(batchNum: number, existing: string[]): string {
  const excludeList =
    existing.length > 0
      ? `\n\n[이미 생성된 기업 목록 — 절대 중복 금지]\n${existing.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
      : "";

  return `너는 전 세계 스타트업, 중소기업, 중견기업을 분석하는 전문 리서처야.
유니콘 기업(기업 가치 $1B 이상)은 배제하고, 다양한 규모의 성공 사례를 발굴해. 특정 지역(남미, 동남아, 동유럽, 아프리카, 중동 등)이나 특정 직업군(치과의사, 배관공, 독립 작가, 농부, 어부, 네일아티스트, 타투이스트, 부동산 중개인 등)을 공략한 스타트업, 중소기업, 중견기업 사례를 포함해.

[배치 ${batchNum}/25] 정확히 20개의 서로 다른 기업 사례를 JSON 배열로 생성해 (실제로 존재하는 회사만).

각 사례는 반드시 다음 필드를 포함해야 해:
- companyName: 반드시 현재 실제로 존재하는 회사명 (등록 기업/실제 운영 중인 사업체)
- companySource: (회사명을 검증할 수 있는 출처 URL, 예: 공식 웹사이트/공시 링크)
- 창의성 보증: 해당 기업이 '잘 알려지지 않음'과 '창의적 비즈니스 모델'을 동시에 만족하는 이유 간단 기술
- industry: 산업군 (예: "Vertical SaaS", "AgTech", "LegalTech", "PetTech", "Manufacturing", "Retail")
- foundedYear: 설립 연도 (2000~2024)
- fundingStage: 투자 단계 ("Bootstrapped", "Pre-Seed", "Seed", "Series A", "Series B", "IPO" 중 하나)
- revenueModel: 수익 모델 ("SaaS", "Marketplace", "Freemium", "Transaction Fee", "Subscription", "Product Sales" 등)
- targetMarket: "B2B", "B2C", "B2B2C" 중 하나
- geographicOrigin: 출신 국가/지역 코드 (예: "US", "EU", "SEA", "KR", "LATAM", "AFRICA", "MENA")
- teamSizeAtLaunch: 런칭 당시 팀 규모 (숫자, 예: 2)
- problem: 해결하는 핵심 문제 (2~3문장, 극도로 구체적)
- solution: 솔루션 설명 (2~3문장)
- initialWedge: 초기 침투 전략 — 어떻게 첫 고객을 획득했는지 (3문장 이상, 구체적 채널/전술 포함)
- unfairAdvantage: 독보적 경쟁우위 — 경쟁자가 따라할 수 없는 이유 (2~3문장)
- revenueUnitEconomics: 수익 구조 — 고객당 매출, 마진, LTV 등 구체적 숫자 포함
- signatureMoves: 성장 트리거 — 성장을 이끈 핵심 전략 (3문장 이상)

다양성 확보 규칙:
- 20개 중 최소 5개 지역(북미, 유럽, 아시아, 남미, 아프리카/중동)에서 골고루 발굴
- B2B, B2C, B2B2C를 고르게 분포
- 기업 규모 다양화: 스타트업(1~10명), 중소기업(11~100명), 중견기업(101~1000명) 골고루 포함
- 산업군이 서로 최대한 겹치지 않게 할 것
${excludeList}

반드시 아래 JSON 형식으로만 응답해:
{ "startups": [ { ... }, { ... }, ... ] }`;
}

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTextContent(companyName: string, s: NicheStartup): string {
  return [
    `[${companyName}]`,
    `핵심 문제: ${s.problem}`,
    `솔루션: ${s.solution}`,
    `초기 진입 전략: ${s.initialWedge}`,
    `독보적 경쟁우위: ${s.unfairAdvantage}`,
    `수익 구조: ${s.revenueUnitEconomics}`,
    `성장 트리거: ${s.signatureMoves}`,
  ].join("\n");
}

const BAR = "═".repeat(62);
const THIN = "─".repeat(62);

// ─────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────

async function main() {
  const upsertCase = await loadUpsertCase();

  console.log(`\n${BAR}`);
  console.log("  Widea — Diverse Business Case Generator (Gemini 2.5 Flash)");
  console.log(BAR);
  console.log(`  Mode    : ${upsertCase ? "PostgreSQL + Pinecone" : "PostgreSQL ONLY"}`);
  console.log(`  Target  : 1000 cases (50 batches × 20)`);
  console.log(`  Model   : gemini-2.5-flash`);
  console.log(`${THIN}\n`);

  const allResults: { name: string; vectorDbId: string; ok: boolean }[] = [];
  const generatedNames: string[] = [];

  for (let batch = 1; batch <= 50; batch++) {
    console.log(`  ┌─ Batch ${batch}/50 ─────────────────────────────────────────┐`);
    console.log(`  │  Gemini에게 20개 니치 스타트업 요청 중...            │`);

    // ── Gemini 호출 ──
    let startups: NicheStartup[];
    try {
      const prompt = buildPrompt(batch, generatedNames);
      const result = await generationModel.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);
      startups = parsed.startups as NicheStartup[];

      if (!Array.isArray(startups) || startups.length === 0) {
        throw new Error("응답에 startups 배열이 없거나 비어 있습니다.");
      }

      console.log(`  │  ✓ ${startups.length}개 사례 수신 완료                          │`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  │  ✗ Gemini 호출 실패: ${msg}`);
      console.log(`  └──────────────────────────────────────────────────────┘\n`);
      continue;
    }

    // ── 개별 저장 ──
    let batchOk = 0;
    for (const [idx, startup] of startups.entries()) {
      const globalIdx = (batch - 1) * 20 + idx + 1;
      const padded = String(globalIdx).padStart(3, " ");

      try {
        const vectorDbId = randomUUID();
        const textContent = buildTextContent(startup.companyName, startup);

        // Pinecone upsert
        if (upsertCase) {
          await upsertCase(textContent, {
            dbId: vectorDbId,
            companyName: startup.companyName,
            businessModel: startup.revenueModel,
            targetMarket: startup.targetMarket,
          });
        }

        // targetMarket enum 매핑
        const tmMap: Record<string, "B2B" | "B2C" | "B2B2C"> = { B2B: "B2B", B2C: "B2C", B2B2C: "B2B2C" };
        const targetMarket = tmMap[startup.targetMarket] ?? null;

        // PostgreSQL upsert
        await prisma.globalCaseMeta.upsert({
          where: { vectorDbId },
          update: {
            companyName: startup.companyName,
            industry: startup.industry,
            foundedYear: startup.foundedYear,
            fundingStage: startup.fundingStage,
            revenueModel: startup.revenueModel,
            targetMarket,
            geographicOrigin: startup.geographicOrigin || null,
            teamSizeAtLaunch: startup.teamSizeAtLaunch || null,
          },
          create: {
            vectorDbId,
            companyName: startup.companyName,
            industry: startup.industry,
            foundedYear: startup.foundedYear,
            fundingStage: startup.fundingStage,
            revenueModel: startup.revenueModel,
            targetMarket,
            geographicOrigin: startup.geographicOrigin || null,
            teamSizeAtLaunch: startup.teamSizeAtLaunch || null,
          },
        });

        generatedNames.push(startup.companyName);
        allResults.push({ name: startup.companyName, vectorDbId, ok: true });
        batchOk++;

        const pineTag = upsertCase ? "P+DB" : " DB ";
        console.log(`  │  [${padded}/100] ${startup.companyName.padEnd(24)} ${pineTag}  OK  │ ${startup.industry}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 50) : String(err);
        allResults.push({ name: startup.companyName, vectorDbId: "-", ok: false });
        console.log(`  │  [${padded}/100] ${startup.companyName.padEnd(24)} FAIL │ ${msg}`);
      }

      // Rate limit (임베딩 API 보호)
      if (upsertCase) await delay(1500);
      else await delay(50);
    }

    console.log(`  │  Batch ${batch} 완료: ${batchOk}/${startups.length} 성공`);
    console.log(`  └──────────────────────────────────────────────────────┘\n`);

    // 배치 간 쿨다운 (Gemini API rate limit 보호)
    if (batch < 5) {
      console.log(`  ⏳ 다음 배치 전 10초 대기...\n`);
      await delay(10000);
    }
  }

  // ── 최종 결과 ──
  console.log(`${BAR}`);
  console.log("  FINAL RESULTS");
  console.log(BAR);

  const okCount = allResults.filter((r) => r.ok).length;
  const failCount = allResults.length - okCount;

  console.log(`  Total Generated : ${allResults.length}`);
  console.log(`  Succeeded       : ${okCount}`);
  console.log(`  Failed          : ${failCount}`);

  if (failCount > 0) {
    console.log(`\n  Failed entries:`);
    allResults
      .filter((r) => !r.ok)
      .forEach((r) => console.log(`    - ${r.name}`));
  }

  console.log(`\n${BAR}`);
  console.log("  NICHE GENERATION COMPLETE");
  console.log(`${BAR}\n`);
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
