import { type PrismaClient, type Prisma } from "@prisma/client";
import { WORKSPACE_TEMPLATE } from "../data/workspaceTemplate.js";

/**
 * 대표 아이디어 선정 시 호출. 이미 워크스페이스가 있으면 no-op.
 * 6 stages × default tasks를 일괄 생성.
 */
export async function ensureWorkspaceForIdea(
  tx: Prisma.TransactionClient | PrismaClient,
  ideaId: string,
): Promise<{ created: boolean }> {
  const existing = await tx.workspaceStage.findFirst({
    where: { ideaId },
    select: { id: true },
  });
  if (existing) return { created: false };

  for (const stage of WORKSPACE_TEMPLATE) {
    const created = await tx.workspaceStage.create({
      data: {
        ideaId,
        stageNumber: stage.stageNumber,
        name: stage.name,
        status: stage.stageNumber === 1 ? "ACTIVE" : "PENDING",
      },
    });
    await tx.workspaceTask.createMany({
      data: stage.tasks.map((t, i) => ({
        stageId: created.id,
        content: t.content,
        outsourceRole: t.outsourceRole ?? null,
        orderIndex: i,
      })),
    });
  }
  return { created: true };
}
