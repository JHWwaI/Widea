import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pinecone } from "@pinecone-database/pinecone";

const prisma = new PrismaClient();
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

(async () => {
  // 옛 10개 (vectorDbId가 'bench-'로 시작 안 함)
  const old = await prisma.globalCaseMeta.findMany({
    where: { vectorDbId: { not: { startsWith: "bench-" } } },
    select: { vectorDbId: true, companyName: true },
  });
  console.log(`옛 ${old.length}개:`);
  for (const c of old) console.log(`  ${c.companyName} → ${c.vectorDbId}`);

  const ids = old.map((c) => c.vectorDbId);
  if (ids.length > 0) {
    console.log(`\nPinecone에서 ${ids.length}개 벡터 삭제 중...`);
    await index.deleteMany(ids);
    console.log("✓ Pinecone 삭제 완료");
  }

  // 옵션: Postgres에서도 삭제 (idea-match → join 시 매칭 안 되도록 보장)
  // 단, 이미 생성된 idea의 sourceBenchmarks 참조가 깨질 수 있어 보존
  console.log("\nPostgres GlobalCaseMeta는 보존 (기존 idea 호환).");

  await prisma.$disconnect();
})();
