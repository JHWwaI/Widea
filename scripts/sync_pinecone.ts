import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildCaseEmbeddingText } from "../src/lib/caseEmbedding.js";

type UpsertCaseFn = typeof import("../src/lib/vectorDb.js").upsertCase;

const prisma = new PrismaClient();

async function main() {
  // Pinecone 환경 변수 확인
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME || !process.env.GEMINI_API_KEY) {
    console.error("PINECONE_API_KEY, PINECONE_INDEX_NAME, GEMINI_API_KEY 환경 변수가 필요합니다.");
    process.exit(1);
  }

  const mod = await import("../src/lib/vectorDb.js");
  const upsertCase: UpsertCaseFn = mod.upsertCase;
  const { searchSimilarCases } = mod;

  // PostgreSQL에서 전체 사례 조회
  const allCases = await prisma.globalCaseMeta.findMany();
  console.log(`PostgreSQL 전체: ${allCases.length}건`);

  // 중복 제거 (같은 companyName이면 최신 것만 유지)
  const nameMap = new Map<string, typeof allCases[number]>();
  const duplicateIds: string[] = [];

  for (const c of allCases) {
    const existing = nameMap.get(c.companyName);
    if (existing) {
      // 오래된 쪽을 중복으로
      if (c.createdAt > existing.createdAt) {
        duplicateIds.push(existing.id);
        nameMap.set(c.companyName, c);
      } else {
        duplicateIds.push(c.id);
      }
    } else {
      nameMap.set(c.companyName, c);
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`중복 ${duplicateIds.length}건 삭제 중...`);
    await prisma.globalCaseMeta.deleteMany({ where: { id: { in: duplicateIds } } });
    console.log(`중복 삭제 완료`);
  }

  // 남은 고유 사례들
  const uniqueCases = Array.from(nameMap.values());
  console.log(`고유 사례: ${uniqueCases.length}건 → Pinecone 동기화 시작\n`);

  let synced = 0;
  let failed = 0;

  for (const c of uniqueCases) {
    try {
      // deepAnalysis 조회 (있으면 고품질 임베딩, 없으면 메타 기반)
      const deepAnalysis = await prisma.globalCaseDeepAnalysis.findUnique({
        where: { globalCaseMetaId: c.id },
      });

      const textContent = buildCaseEmbeddingText({
        companyName: c.companyName,
        industry: c.industry,
        revenueModel: c.revenueModel,
        targetMarket: c.targetMarket,
        foundedYear: c.foundedYear,
        fundingStage: c.fundingStage,
        geographicOrigin: c.geographicOrigin,
        targetCustomerProfile: c.targetCustomerProfile,
        // deepAnalysis 필드들 (있으면 포함)
        ...(deepAnalysis
          ? {
              problemStatement: deepAnalysis.problemStatement,
              solutionCore: deepAnalysis.solutionCore,
              initialWedge: deepAnalysis.initialWedge,
              unfairAdvantage: deepAnalysis.unfairAdvantage,
              unitEconomics: deepAnalysis.unitEconomics,
              signatureMoves: deepAnalysis.signatureMoves,
            }
          : {}),
      });

      await upsertCase(textContent, {
        dbId: c.vectorDbId,
        companyName: c.companyName,
        businessModel: c.revenueModel ?? "N/A",
        targetMarket: c.targetMarket ?? "B2C", // PostgreSQL에서 실제 값 읽기 (버그 수정)
      });

      synced++;
      if (synced % 50 === 0) {
        console.log(`  [${synced}/${uniqueCases.length}] 진행 중...`);
      }

      // Gemini 임베딩 API rate limit 보호
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message.slice(0, 60) : String(err);
      console.error(`  ✗ ${c.companyName}: ${msg}`);
    }
  }

  console.log(`\n완료: ${synced}건 동기화, ${failed}건 실패`);

  const finalCount = await prisma.globalCaseMeta.count();
  console.log(`PostgreSQL 최종: ${finalCount}건`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
