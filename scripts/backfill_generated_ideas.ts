import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  IDEA_MATCH_GENERATION_VERSION,
  normalizeGeneratedIdeas,
} from "../src/lib/ideaMatch.js";

const prisma = new PrismaClient();

function readArg(flag: string): string | undefined {
  const index = process.argv.findIndex((value) => value === flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const limit = Math.max(1, Number(readArg("--limit") ?? "200"));
  const sessionId = readArg("--session-id");
  const shouldWrite = hasFlag("--write");

  const sessions = await prisma.ideaMatchSession.findMany({
    where: {
      ...(sessionId ? { id: sessionId } : {}),
      generatedIdeas: { none: {} },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      locale: true,
      generationVersion: true,
      localizedIdeas: true,
      projectPolicy: {
        select: {
          title: true,
        },
      },
    },
  });

  let matchedSessions = 0;
  let createdIdeas = 0;

  for (const session of sessions) {
    const generatedIdeas = normalizeGeneratedIdeas(session.localizedIdeas);
    if (generatedIdeas.length === 0) {
      continue;
    }

    matchedSessions += 1;
    createdIdeas += generatedIdeas.length;

    console.log(
      `[candidate] ${session.id} | ${session.projectPolicy.title} | ${generatedIdeas.length} ideas`,
    );

    if (!shouldWrite) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.generatedIdea.createMany({
        data: generatedIdeas.map((idea) => ({
          sessionId: session.id,
          ...idea,
        })),
        skipDuplicates: true,
      });

      await tx.ideaMatchSession.update({
        where: { id: session.id },
        data: {
          locale: session.locale || "ko-KR",
          generationVersion: session.generationVersion || IDEA_MATCH_GENERATION_VERSION,
        },
      });
    });
  }

  console.log("");
  console.log(`Scanned sessions: ${sessions.length}`);
  console.log(`Backfillable sessions: ${matchedSessions}`);
  console.log(`Generated ideas to create: ${createdIdeas}`);

  if (!shouldWrite) {
    console.log("");
    console.log("Dry run only. Re-run with --write to persist generated ideas.");
  } else {
    console.log("");
    console.log("Backfill completed.");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
