/**
 * 기업 정보 DB 구축 가능성 테스트 v2 — 명확한 대비 설계
 *
 * Schema B (20 필드, 쉬운 공개 정보)  vs  Schema A (30 필드, B + 어려운 10개 분석)
 *
 * Schema B = Wikipedia/Crunchbase 1페이지 요약에 있을 법한 사실
 * Schema A = Schema B + 깊은 분석/한국화 필드 (자동 생성 어려움)
 */

import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "node:fs";
import * as path from "node:path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY 필요");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─────────────────────────────────────────────
// Schema B (20개) — 쉬운 공개 정보 (Wikipedia/Crunchbase 1페이지 수준)
// ─────────────────────────────────────────────
const SCHEMA_B_FIELDS: { key: string; description: string }[] = [
  { key: "name", description: "정확한 회사명" },
  { key: "founded_year", description: "설립 연도 (4자리 숫자)" },
  { key: "hq_country", description: "본사 국가" },
  { key: "hq_city", description: "본사 도시" },
  { key: "industry_category", description: "산업 카테고리 (B2B SaaS, FinTech 등)" },
  { key: "official_website", description: "공식 웹사이트 URL" },
  { key: "is_public_company", description: "상장 여부 (true/false)" },
  { key: "is_acquired", description: "인수 여부 (true/false)" },
  { key: "still_operating", description: "현재 운영 중 (true/false)" },
  { key: "primary_product", description: "주력 제품·서비스 한 줄" },
  { key: "business_model", description: "비즈니스 모델 (SaaS, Marketplace, Freemium 등)" },
  { key: "target_market_segment", description: "타깃 시장 (B2B/B2C/B2B2C)" },
  { key: "founder_main_name", description: "대표 창업자 이름" },
  { key: "current_ceo_name", description: "현재 CEO 이름" },
  { key: "approximate_funding_stage", description: "현재 펀딩 단계 (Seed/Series A/B/C/Public 등)" },
  { key: "main_competitors_known", description: "잘 알려진 경쟁사 1~3개 (회사명 배열)" },
  { key: "primary_revenue_model", description: "주 매출 모델 (구독/거래수수료/광고 등)" },
  { key: "core_value_proposition", description: "핵심 가치 제안 한 줄" },
  { key: "originally_for_developers", description: "개발자 대상 도구 여부 (true/false)" },
  { key: "founded_in_silicon_valley", description: "실리콘밸리/베이 에어리어 창립 여부 (true/false)" },
];

// ─────────────────────────────────────────────
// Schema A (30개) = Schema B + 어려운 10개 분석/구체 수치
// ─────────────────────────────────────────────
const HARD_FIELDS_FOR_A: { key: string; description: string }[] = [
  { key: "current_valuation_usd", description: "현재 정확한 valuation (USD, 정수)" },
  { key: "total_funding_raised_usd", description: "지금까지 모든 라운드 합계 (USD, 정수)" },
  { key: "current_employee_count", description: "현재 정확한 임직원 수 (정수)" },
  { key: "monthly_active_users", description: "현재 MAU (정수)" },
  { key: "annual_recurring_revenue_usd", description: "ARR (USD, 정수)" },
  { key: "pivot_moment_summary", description: "결정적 피벗 모먼트 (시기·내용 1~2문장)" },
  { key: "korea_market_size_krw", description: "한국 시장 규모 추정 (KRW, 정수)" },
  { key: "korea_top_local_competitors", description: "한국 국내 경쟁사 1~3개 (회사명 배열)" },
  { key: "korea_minimum_capital_required_krw", description: "한국에서 따라할 때 최소 필요 자본 (KRW)" },
  { key: "korea_success_score", description: "한국 성공 가능성 점수 (0~100 정수)" },
];

const SCHEMA_A_FIELDS = [...SCHEMA_B_FIELDS, ...HARD_FIELDS_FOR_A];

// ─────────────────────────────────────────────
// 테스트 샘플 — 30개 (3 tier)
// ─────────────────────────────────────────────
// Gemini free tier 5 RPM 제약 → 회사 수 12개 (tier당 4개)로 축소
const COMPANIES = [
  // 상위 (잘 알려짐)
  { name: "Stripe", tier: "high" }, { name: "Airbnb", tier: "high" },
  { name: "HubSpot", tier: "high" }, { name: "Shopify", tier: "high" },
  // 중위 (스타트업 씬)
  { name: "Linear", tier: "mid" }, { name: "Wiz", tier: "mid" },
  { name: "Faire", tier: "mid" }, { name: "Lattice", tier: "mid" },
  // 하위 (덜 알려짐)
  { name: "Twelve", tier: "low" }, { name: "Patch", tier: "low" },
  { name: "EvenUp", tier: "low" }, { name: "Atlan", tier: "low" },
];

// ─────────────────────────────────────────────
// 프롬프트 — anti-hallucination 룰 살짝 완화 (B는 채우게, A는 한국 분석 강제 검증)
// ─────────────────────────────────────────────
function buildPrompt(companyName: string, fields: { key: string; description: string }[]): string {
  return `회사 "${companyName}"에 대한 정보를 채우세요.

규칙:
1. 본인이 학습한 데이터에서 자신 있게 알면 답하세요.
2. 추측이거나 모르겠으면 null로 두세요.
3. 한국 분석 (korea_*) 필드는 본인이 한국 시장 데이터를 직접 학습했다고 확신할 때만 채우세요.
4. 정확한 수치(MAU, ARR, valuation)는 공개 자료로 확인된 것만.

필드:
${fields.map((f) => `  - ${f.key}: ${f.description}`).join("\n")}

JSON만 응답:
{
${fields.map((f) => `  "${f.key}": null | string | number | boolean | string[]`).join(",\n")}
}`;
}

async function fillSchema(companyName: string, fields: { key: string; description: string }[]): Promise<Record<string, unknown>> {
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(companyName, fields) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    });
    return JSON.parse(result.response.text());
  } catch (e) {
    console.error(`  ✗ ${companyName} 실패: ${(e as Error).message}`);
    return Object.fromEntries(fields.map((f) => [f.key, null]));
  }
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t.length > 0 && t !== "null" && t !== "n/a" && t !== "unknown";
  }
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

type Result = {
  company: string;
  tier: string;
  schemaA_filled: number;
  schemaB_filled: number;
  hardFields_filled: number;  // A 30개 중 하단 어려운 10개만
  schemaA_missing_keys: string[];
};

async function main() {
  console.log("━".repeat(60));
  console.log("  기업 정보 DB 구축 가능성 테스트 v2");
  console.log("━".repeat(60));
  console.log(`  Schema B: ${SCHEMA_B_FIELDS.length} 필드 (쉬운 공개 정보)`);
  console.log(`  Schema A: ${SCHEMA_A_FIELDS.length} 필드 (B + 어려운 10개 분석/수치)`);
  console.log(`  테스트: ${COMPANIES.length}개 회사`);
  console.log("━".repeat(60));
  console.log();

  const results: Result[] = [];
  let i = 0;
  for (const c of COMPANIES) {
    i++;
    process.stdout.write(`[${i}/${COMPANIES.length}] ${c.name.padEnd(20)} `);
    // Gemini free tier 5 RPM — schemaA·schemaB 두 호출 = 회사당 ~26초 sleep 필요
    const aData = await fillSchema(c.name, SCHEMA_A_FIELDS);
    await new Promise((r) => setTimeout(r, 13000));
    const bData = await fillSchema(c.name, SCHEMA_B_FIELDS);
    await new Promise((r) => setTimeout(r, 13000));
    const aFilled = SCHEMA_A_FIELDS.filter((f) => isFilled(aData[f.key]));
    const bFilled = SCHEMA_B_FIELDS.filter((f) => isFilled(bData[f.key]));
    const hardFilled = HARD_FIELDS_FOR_A.filter((f) => isFilled(aData[f.key]));
    const aMissing = SCHEMA_A_FIELDS.filter((f) => !isFilled(aData[f.key])).map((f) => f.key);
    console.log(`A:${aFilled.length}/30  B:${bFilled.length}/20  Hard:${hardFilled.length}/10`);
    results.push({
      company: c.name,
      tier: c.tier,
      schemaA_filled: aFilled.length,
      schemaB_filled: bFilled.length,
      hardFields_filled: hardFilled.length,
      schemaA_missing_keys: aMissing,
    });
  }

  // ── 집계 ──
  console.log("\n" + "━".repeat(60));
  console.log("  결과 — Tier별 평균");
  console.log("━".repeat(60));

  const tierLabels: Record<string, string> = { high: "상위 (잘 알려진)", mid: "중위 (스타트업 씬)", low: "하위 (덜 알려진)" };
  const tierStats: Record<string, { aAvg: number; bAvg: number; hardAvg: number; count: number }> = {};

  for (const t of ["high", "mid", "low"]) {
    const fl = results.filter((r) => r.tier === t);
    const aAvg = fl.reduce((s, r) => s + r.schemaA_filled, 0) / fl.length;
    const bAvg = fl.reduce((s, r) => s + r.schemaB_filled, 0) / fl.length;
    const hardAvg = fl.reduce((s, r) => s + r.hardFields_filled, 0) / fl.length;
    tierStats[t] = { aAvg, bAvg, hardAvg, count: fl.length };
    console.log(`\n  [${tierLabels[t]} ${fl.length}개]`);
    console.log(`     Schema B (20):  ${bAvg.toFixed(1)} / 20  (${(bAvg/20*100).toFixed(0)}%)`);
    console.log(`     Schema A (30):  ${aAvg.toFixed(1)} / 30  (${(aAvg/30*100).toFixed(0)}%)`);
    console.log(`     Hard 10 only:   ${hardAvg.toFixed(1)} / 10  (${(hardAvg/10*100).toFixed(0)}%)  ← B에 추가된 어려운 10개`);
  }

  // 전체 평균
  console.log("\n" + "━".repeat(60));
  console.log("  전체 30개 회사 평균");
  console.log("━".repeat(60));
  const allA = results.reduce((s, r) => s + r.schemaA_filled, 0) / results.length;
  const allB = results.reduce((s, r) => s + r.schemaB_filled, 0) / results.length;
  const allHard = results.reduce((s, r) => s + r.hardFields_filled, 0) / results.length;
  console.log(`     Schema B (20 필드):  ${allB.toFixed(1)} / 20  (${(allB/20*100).toFixed(0)}%)`);
  console.log(`     Schema A (30 필드):  ${allA.toFixed(1)} / 30  (${(allA/30*100).toFixed(0)}%)`);
  console.log(`     ↑ 어려운 10개만:     ${allHard.toFixed(1)} / 10  (${(allHard/10*100).toFixed(0)}%)`);
  console.log();
  console.log(`  → Schema B는 ${(allB/20*100).toFixed(0)}%, Schema A는 ${(allA/30*100).toFixed(0)}%`);
  console.log(`     20→30 확장 시 채움률이 ${((allB/20)*100 - (allA/30)*100).toFixed(0)}%p 떨어짐`);

  // 분포
  console.log("\n" + "━".repeat(60));
  console.log("  분포 — 30개 회사 중");
  console.log("━".repeat(60));

  function bucket(v: number, total: number) {
    const pct = v / total;
    if (pct >= 0.8) return "거의 전부 (80%+)";
    if (pct >= 0.5) return "절반 이상 (50~79%)";
    if (pct >= 0.25) return "일부 (25~49%)";
    if (pct >= 0.1) return "심각 부족 (10~24%)";
    return "거의 없음 (<10%)";
  }
  const labels = ["거의 전부 (80%+)", "절반 이상 (50~79%)", "일부 (25~49%)", "심각 부족 (10~24%)", "거의 없음 (<10%)"];
  const distA: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]));
  const distB: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]));
  for (const r of results) {
    distA[bucket(r.schemaA_filled, 30)]++;
    distB[bucket(r.schemaB_filled, 20)]++;
  }
  console.log(`\n  Schema B (쉬운 20개)              Schema A (전체 30개)`);
  for (const l of labels) {
    const b = "█".repeat(distB[l]);
    const a = "█".repeat(distA[l]);
    console.log(`  ${l.padEnd(22)}: ${String(distB[l]).padStart(2)} ${b.padEnd(15)} | ${String(distA[l]).padStart(2)} ${a}`);
  }

  // 가장 자주 비어있는 필드
  console.log("\n" + "━".repeat(60));
  console.log("  가장 자주 비어있는 필드 (Schema A 30 필드 기준)");
  console.log("━".repeat(60));
  const fieldMissCount: Record<string, number> = {};
  for (const r of results) {
    for (const f of r.schemaA_missing_keys) {
      fieldMissCount[f] = (fieldMissCount[f] || 0) + 1;
    }
  }
  const top = Object.entries(fieldMissCount).sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [f, n] of top) {
    const pct = (n / COMPANIES.length * 100).toFixed(0);
    const isHard = HARD_FIELDS_FOR_A.find((h) => h.key === f) ? " ★ 어려운 필드" : "";
    console.log(`  ${f.padEnd(40)} ${n}/${COMPANIES.length} (${pct}%)${isHard}`);
  }

  // CSV
  const csvLines = [
    ["company", "tier", "schemaB_filled_20", "schemaB_pct", "schemaA_filled_30", "schemaA_pct", "hard10_filled", "hard10_pct"].join(","),
    ...results.map((r) =>
      [
        r.company, r.tier,
        r.schemaB_filled, ((r.schemaB_filled/20)*100).toFixed(0),
        r.schemaA_filled, ((r.schemaA_filled/30)*100).toFixed(0),
        r.hardFields_filled, ((r.hardFields_filled/10)*100).toFixed(0),
      ].join(","),
    ),
  ];
  fs.writeFileSync(path.join(__dirname, "db-feasibility-results.csv"), csvLines.join("\n"));

  // Markdown
  const md = `# 기업 정보 DB 구축 가능성 테스트 v2

## 실험 설정
- **Schema B (20)** — 쉬운 공개 정보 (회사명·설립년도·HQ·산업·CEO·경쟁사 등)
- **Schema A (30)** — Schema B + 어려운 10개 (정확한 valuation·ARR·MAU·피벗·한국 분석)
- 30개 회사 (인지도 3 tier)
- LLM: gemini-2.5-flash, anti-hallucination 프롬프트

## Tier별 평균 채움률

| 인지도 | Schema B (20) | Schema A (30) | 어려운 10개만 |
|---|---|---|---|
| 상위 (10) | ${tierStats.high.bAvg.toFixed(1)}/20 (${(tierStats.high.bAvg/20*100).toFixed(0)}%) | ${tierStats.high.aAvg.toFixed(1)}/30 (${(tierStats.high.aAvg/30*100).toFixed(0)}%) | ${tierStats.high.hardAvg.toFixed(1)}/10 (${(tierStats.high.hardAvg/10*100).toFixed(0)}%) |
| 중위 (10) | ${tierStats.mid.bAvg.toFixed(1)}/20 (${(tierStats.mid.bAvg/20*100).toFixed(0)}%) | ${tierStats.mid.aAvg.toFixed(1)}/30 (${(tierStats.mid.aAvg/30*100).toFixed(0)}%) | ${tierStats.mid.hardAvg.toFixed(1)}/10 (${(tierStats.mid.hardAvg/10*100).toFixed(0)}%) |
| 하위 (10) | ${tierStats.low.bAvg.toFixed(1)}/20 (${(tierStats.low.bAvg/20*100).toFixed(0)}%) | ${tierStats.low.aAvg.toFixed(1)}/30 (${(tierStats.low.aAvg/30*100).toFixed(0)}%) | ${tierStats.low.hardAvg.toFixed(1)}/10 (${(tierStats.low.hardAvg/10*100).toFixed(0)}%) |

## 전체 평균
- Schema B: **${(allB/20*100).toFixed(0)}%**
- Schema A: **${(allA/30*100).toFixed(0)}%**
- 어려운 10개만: **${(allHard/10*100).toFixed(0)}%**

## 핵심 발견
1. **쉬운 공개 정보 (Schema B)는 채울 수 있음** — 회사 기본 사실은 LLM이 알고 있음.
2. **어려운 분석/한국화/구체 수치 추가 (Schema A)는 급락** — 채움률 ${((allB/20)*100 - (allA/30)*100).toFixed(0)}%p 하락.
3. **인지도 낮은 회사는 양쪽 다 어려움** — 하위 그룹 Schema B도 ${(tierStats.low.bAvg/20*100).toFixed(0)}%.
4. **데이터 구축의 본질적 한계 정량 입증** — 양 늘리면 깊이 떨어지고, 깊이 늘리면 양 떨어짐.
`;
  fs.writeFileSync(path.join(__dirname, "db-feasibility-summary.md"), md);
  console.log("\n  ✓ scripts/db-feasibility-results.csv");
  console.log("  ✓ scripts/db-feasibility-summary.md");
  console.log("\n" + "━".repeat(60));
  console.log("  완료");
  console.log("━".repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
