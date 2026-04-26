import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("실제 여부 검증 시작: GlobalCaseMeta");

  const cases = await prisma.globalCaseMeta.findMany({});
  console.log(`총 ${cases.length}개 케이스 조회`);

  let kept = 0;
  let removed = 0;
  const invalidRecords: string[] = [];

  for (const item of cases) {
    const name = item.companyName.trim();
    const source = item.companySource?.trim();

    let isValid = false;
    let resolvedSource = source;

    if (source && source.startsWith("http")) {
      isValid = true;
    } else {
      // Wikidata에서 기업 존재 여부 확인
      try {
        const apiUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&type=item&limit=1`;
        const res = await fetch(apiUrl);
        const body = await res.json();

        if (body && Array.isArray(body.search) && body.search.length > 0) {
          isValid = true;
          resolvedSource = `https://www.wikidata.org/wiki/${body.search[0].id}`;
        }
      } catch (e) {
        // 네트워크 이슈가 있을 수 있으므로, 이 경우 이름이 유명 목록에 있으면 남겨둡니다.
        const knownList = ["Notion", "Calendly", "Toss", "Airbnb", "Uber", "Slack", "Stripe", "Shopify"];
        if (knownList.includes(name)) {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      await prisma.globalCaseMeta.delete({ where: { id: item.id } });
      removed += 1;
      invalidRecords.push(name);
    } else {
      if (resolvedSource && resolvedSource !== source) {
        await prisma.globalCaseMeta.update({
          where: { id: item.id },
          data: { companySource: resolvedSource },
        });
      }
      kept += 1;
    }
  }

  console.log(`유지된 항목: ${kept}, 삭제된 항목: ${removed}`);
  if (invalidRecords.length > 0) {
    console.log("삭제된 회사:", invalidRecords.join(", "));
  }

  const finalCount = await prisma.globalCaseMeta.count();
  console.log(`최종 남은 케이스: ${finalCount}`);

  // 1000개를 목표로 남은 건수 채우기 (최소 안정 마크)
  if (finalCount < 1000) {
    console.log(`1000개를 채우기 위해 추가 생성 필요: ${1000 - finalCount}개`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});