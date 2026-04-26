/**
 * import_enrich_result.ts — Gemini Pro 수동 결과 DB 저장 스크립트
 *
 * 사용:
 *   1. scripts/enrich_result.json 에 Gemini Pro 결과 JSON 배열 저장
 *   2. npm run import_enrich
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient, type DifficultyLevel } from "@prisma/client";
import { buildCaseEmbeddingText } from "../src/lib/caseEmbedding.js";

type UpsertCaseFn = typeof import("../src/lib/vectorDb.js").upsertCase;
type JsonObj = { [key: string]: string | number | boolean | null | JsonObj | (string | number | boolean | null | JsonObj)[] };

const prisma = new PrismaClient();
const BAR = "─".repeat(72);

function toStr(v: unknown): string {
  if (Array.isArray(v)) return v.join("\n");
  return String(v ?? "");
}

async function main() {
  console.log("\n" + BAR);
  console.log("  Widea — Manual Enrich Result Importer");
  console.log(BAR);

  const resultPath = path.join(process.cwd(), "scripts", "enrich_result.json");
  if (!fs.existsSync(resultPath)) {
    console.error("❌ scripts/enrich_result.json 파일이 없습니다.");
    process.exit(1);
  }

  const raw = fs.readFileSync(resultPath, "utf-8");
  let results: any[];
  try {
    results = JSON.parse(raw);
    if (!Array.isArray(results)) results = [results];
  } catch (e) {
    console.error("❌ JSON 파싱 실패:", e);
    process.exit(1);
  }

  console.log(`  결과 항목: ${results.length}개\n`);

  // Pinecone 선택적 로드
  let upsertCase: UpsertCaseFn | null = null;
  if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
    const mod = await import("../src/lib/vectorDb.js");
    upsertCase = mod.upsertCase;
    console.log("  Pinecone: 활성화됨\n");
  }

  let success = 0;
  let notFound = 0;
  let failed = 0;

  for (const result of results) {
    const companyName = result.companyName;
    if (!companyName) { console.log("⚠ companyName 없음, 스킵"); failed++; continue; }

    process.stdout.write(`${companyName} ... `);

    // DB에서 회사 찾기 (이름 매칭)
    const meta = await prisma.globalCaseMeta.findFirst({
      where: { companyName: { equals: companyName, mode: "insensitive" } },
    });

    if (!meta) {
      process.stdout.write(`⚠ DB에서 찾을 수 없음\n`);
      notFound++;
      continue;
    }

    try {
      const tmMap: Record<string, "B2B" | "B2C" | "B2B2C"> = { B2B: "B2B", B2C: "B2C", B2B2C: "B2B2C" };
      const enrichedTargetMarket = tmMap[result.targetMarket] ?? null;

      // JSON 블록 개수로 품질 점수 계산
      const jsonBlocks = [
        result.growthStory, result.technologyDNA, result.founderDNA,
        result.koreaStrategy, result.replicationGuide, result.marketTiming,
        result.competitiveLandscape, result.revenueDeepDive, result.networkEffects,
        result.expansionPlaybook, result.investorPOV,
      ];
      const filledBlocks = jsonBlocks.filter((b) => b && Object.keys(b).length > 0).length;
      const textFields = [result.problemStatement, result.solutionCore, result.initialWedge,
        result.unfairAdvantage, result.unitEconomics, result.signatureMoves];
      const filledText = textFields.filter(Boolean).length;
      const qualityScore = Math.round((filledBlocks / 11) * 70 + (filledText / 6) * 30);

      // DeepAnalysis upsert
      await prisma.globalCaseDeepAnalysis.upsert({
        where: { globalCaseMetaId: meta.id },
        create: {
          globalCaseMetaId: meta.id,
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

      // Meta 업데이트
      await prisma.globalCaseMeta.update({
        where: { id: meta.id },
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

      // Pinecone 재업서트
      if (upsertCase) {
        const textContent = buildCaseEmbeddingText({
          companyName: meta.companyName, industry: meta.industry,
          revenueModel: meta.revenueModel, targetMarket: meta.targetMarket,
          foundedYear: meta.foundedYear, fundingStage: meta.fundingStage,
          geographicOrigin: meta.geographicOrigin, targetCustomerProfile: meta.targetCustomerProfile,
          shortDescription: result.shortDescription, tags: result.tags,
          problemStatement: result.problemStatement, solutionCore: result.solutionCore,
          initialWedge: result.initialWedge, unfairAdvantage: result.unfairAdvantage,
          unitEconomics: result.unitEconomics, signatureMoves: result.signatureMoves,
          koreaAdaptNotes: result.koreaAdaptNotes,
          growthStory: result.growthStory, technologyDNA: result.technologyDNA,
          founderDNA: result.founderDNA, koreaStrategy: result.koreaStrategy,
          replicationGuide: result.replicationGuide, marketTiming: result.marketTiming,
          competitiveLandscape: result.competitiveLandscape, revenueDeepDive: result.revenueDeepDive,
          networkEffects: result.networkEffects, expansionPlaybook: result.expansionPlaybook,
          investorPOV: result.investorPOV,
        });
        await upsertCase(textContent, {
          dbId: meta.vectorDbId, companyName: meta.companyName,
          businessModel: meta.revenueModel ?? "N/A", targetMarket: meta.targetMarket ?? "B2C",
        });
      }

      process.stdout.write(`✅ (품질: ${qualityScore}점)\n`);
      success++;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`❌\n`);
      console.error("  에러:", msg);
      failed++;
    }
  }

  console.log("\n" + BAR);
  console.log(`  완료: ✅ ${success}건 성공  ⚠ ${notFound}건 미발견  ❌ ${failed}건 실패`);

  const finalCount = await prisma.globalCaseMeta.count({ where: { dataQualityScore: { gte: 80 } } });
  console.log(`  품질 80점 이상: ${finalCount}건`);
  console.log(BAR + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Script failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
