import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.globalCaseMeta.findMany({
    where: { OR: [{ deepAnalysis: null }, { dataQualityScore: { lt: 80 } }] },
    include: { deepAnalysis: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  for (const c of cases) {
    console.log(JSON.stringify({
      id: c.id,
      companyName: c.companyName,
      industry: c.industry,
      revenueModel: c.revenueModel,
      foundedYear: c.foundedYear,
      geographicOrigin: c.geographicOrigin,
      targetMarket: c.targetMarket,
    }));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
