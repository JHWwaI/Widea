/**
 * 모든 SELECTED idea의 stages를 v1 템플릿으로 강제 재시드.
 * 기존 stages가 있으면 건너뜀.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { WORKSPACE_TEMPLATE } from "../src/data/workspaceTemplate.js";

const prisma = new PrismaClient();

async function main() {
  const ideas = await prisma.generatedIdea.findMany({
    where: { status: "SELECTED" },
    select: { id: true, titleKo: true },
  });

  for (const i of ideas) {
    const ec = await prisma.workspaceStage.count({ where: { ideaId: i.id } });
    if (ec === 0) {
      for (const stage of WORKSPACE_TEMPLATE) {
        const created = await prisma.workspaceStage.create({
          data: {
            ideaId: i.id,
            stageNumber: stage.stageNumber,
            name: stage.name,
            status: stage.stageNumber === 1 ? "ACTIVE" : "PENDING",
          },
        });
        await prisma.workspaceTask.createMany({
          data: stage.tasks.map((t, idx) => ({
            stageId: created.id,
            content: t.content,
            outsourceRole: t.outsourceRole ?? null,
            orderIndex: t.optional ? 100 + idx : idx,
          })),
        });
      }
      console.log(`seeded: ${i.titleKo}`);
    } else {
      console.log(`skip: ${i.titleKo} (이미 ${ec}개 단계)`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
