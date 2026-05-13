/**
 * 데모용 — 모든 SELECTED idea의 task에 마감일 자동 분배.
 * 캘린더가 비어있지 않게 시연용으로 시간 분포를 만든다.
 *
 * 분포:
 *   stage 1 (문제 검증)   → 오늘 ~ +7일
 *   stage 2 (수요 검증)   → +7 ~ +14일
 *   stage 3 (MVP 빌드)    → +14 ~ +30일
 *   stage 4 (베타 + 학습) → +30 ~ +45일
 *   stage 5 (첫 매출)     → +45 ~ +60일
 *   stage 6 (사업화·확장) → +60 ~ +90일
 *
 * 일부 task는 의도적으로 (오늘 / 내일 / -3일 지난 = 기한초과)에 배치 — 시연 임팩트.
 *
 * 사용:
 *   npx tsx --env-file=.env scripts/seed_demo_dueDates.ts
 *   npx tsx --env-file=.env scripts/seed_demo_dueDates.ts --reset    # 마감일 모두 비움
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** stage 번호별 마감일 범위(today부터의 일 수) */
const STAGE_RANGE: Record<number, [number, number]> = {
  1: [0, 7],
  2: [7, 14],
  3: [14, 30],
  4: [30, 45],
  5: [45, 60],
  6: [60, 90],
};

/** 시연용 강조 — 첫 stage에서 의도적으로 (-3, 0, 1, 3) 배치 */
const SHOWCASE_OFFSETS = [-3, 0, 0, 1, 3];

async function main() {
  const reset = process.argv.includes("--reset");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (reset) {
    const r = await prisma.workspaceTask.updateMany({ data: { dueDate: null } });
    console.log(`[reset] ${r.count}개 task 마감일 초기화`);
    await prisma.$disconnect();
    return;
  }

  const ideas = await prisma.generatedIdea.findMany({
    where: { status: "SELECTED" },
    select: { id: true, titleKo: true },
  });
  console.log(`SELECTED idea ${ideas.length}개 처리`);

  let totalUpdated = 0;

  for (const idea of ideas) {
    const stages = await prisma.workspaceStage.findMany({
      where: { ideaId: idea.id },
      orderBy: { stageNumber: "asc" },
      include: {
        tasks: { orderBy: { orderIndex: "asc" } },
      },
    });

    let showcaseUsed = 0;

    for (const stage of stages) {
      const range = STAGE_RANGE[stage.stageNumber] ?? [0, 30];
      const [minDay, maxDay] = range;

      // core task만 분배 (orderIndex < 100)
      const core = stage.tasks.filter((t) => t.orderIndex < 100);

      for (let i = 0; i < core.length; i++) {
        const t = core[i];
        let offset: number;

        // 첫 stage에서 일부 task는 시연용 강조 분포
        if (stage.stageNumber === 1 && showcaseUsed < SHOWCASE_OFFSETS.length) {
          offset = SHOWCASE_OFFSETS[showcaseUsed];
          showcaseUsed++;
        } else {
          // stage 범위 안에서 균등 분배 + 약간 랜덤
          const span = maxDay - minDay;
          const ratio = (i + 1) / (core.length + 1);
          const jitter = Math.floor(Math.random() * 2);
          offset = minDay + Math.round(span * ratio) + jitter;
        }

        const due = addDays(today, offset);
        // dueDate 비어있는 task에 분배 (status 무관 — 완료된 것도 시연용으로 마감일 표시)
        if (!t.dueDate) {
          await prisma.workspaceTask.update({
            where: { id: t.id },
            data: { dueDate: due },
          });
          totalUpdated++;
        }
      }
    }

    console.log(`  ✓ ${idea.titleKo}`);
  }

  console.log(`\n총 ${totalUpdated}개 task에 마감일 분배 완료.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
