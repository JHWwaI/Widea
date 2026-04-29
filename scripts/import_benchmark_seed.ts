/**
 * src/data/benchmarks/seed.jsonl 의 100개 벤치마크를
 * GlobalCaseMeta + GlobalCaseDeepAnalysis 테이블에 적재.
 *
 * 사용:
 *   pnpm tsx --env-file=.env scripts/import_benchmark_seed.ts
 *   pnpm tsx --env-file=.env scripts/import_benchmark_seed.ts --dry
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, TargetMarket } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = {
  metadata: {
    category: string;
    sub_category: string;
    industry_keywords?: string[];
    similarity_vector_seed?: string;
  };
  company_profile: {
    name: string;
    founded_year?: number;
    location?: string;
    status?: {
      stage?: string;
      valuation_usd?: number;
      total_funding_usd?: number;
    };
  };
  product_logic?: {
    core_value_prop?: string;
    pain_point_mapping?: string;
    pivot_moment?: string;
    mvp_scope?: { features?: string[]; development_complexity?: string };
    tech_stack_hint?: string[];
  };
  market_entry?: {
    beachhead_market?: string;
    initial_user_acquisition?: { channel?: string; method?: string };
  };
  reliability_evidence?: {
    crunchbase?: string;
    archive_link?: string;
    social_proof?: string;
  };
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferGeo(location?: string): string | null {
  if (!location) return null;
  const l = location.toLowerCase();
  if (l.includes("usa") || l.includes("united states")) return "US";
  if (l.includes("uk") || l.includes("united kingdom")) return "UK";
  if (l.includes("canada")) return "CA";
  if (l.includes("germany") || l.includes("berlin")) return "DE";
  if (l.includes("france") || l.includes("paris")) return "FR";
  if (l.includes("netherlands") || l.includes("amsterdam")) return "NL";
  if (l.includes("denmark") || l.includes("copenhagen")) return "DK";
  if (l.includes("norway") || l.includes("oslo")) return "NO";
  if (l.includes("sweden")) return "SE";
  if (l.includes("switzerland") || l.includes("zurich")) return "CH";
  if (l.includes("israel") || l.includes("tel aviv")) return "IL";
  if (l.includes("india") || l.includes("bengaluru")) return "IN";
  if (l.includes("singapore")) return "SG";
  if (l.includes("croatia") || l.includes("zagreb")) return "HR";
  if (l.includes("estonia") || l.includes("tallinn")) return "EE";
  if (l.includes("australia") || l.includes("melbourne")) return "AU";
  if (l.includes("ireland") || l.includes("dublin")) return "IE";
  return null;
}

function inferActive(stage?: string): boolean {
  if (!stage) return true;
  const s = stage.toLowerCase();
  if (s.includes("bankrupt") || s.includes("liquidat")) return false;
  return true;
}

function inferTargetMarket(category: string, sub: string): TargetMarket | null {
  const text = `${category} ${sub}`.toLowerCase();
  if (text.includes("consumer") || text.includes("creator") || text.includes("social"))
    return TargetMarket.B2C;
  if (text.includes("healthtech") || text.includes("edtech") || text.includes("proptech"))
    return TargetMarket.B2B2C;
  return TargetMarket.B2B;
}

function clampShort(s: string | undefined, max: number): string | null {
  if (!s) return null;
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

async function main() {
  const dry = process.argv.includes("--dry");
  const repoRoot = path.resolve(__dirname, "..");
  const seedPath = path.resolve(repoRoot, "src/data/benchmarks/seed.jsonl");

  const lines = fs
    .readFileSync(seedPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`[load] ${lines.length} entries`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of lines) {
    let entry: Entry;
    try {
      entry = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }

    const name = entry.company_profile?.name?.trim();
    if (!name) {
      skipped++;
      continue;
    }

    const vectorDbId = `bench-${slugify(name)}`;
    const meta = {
      vectorDbId,
      companyName: name,
      industry: entry.metadata.category,
      foundedYear: entry.company_profile.founded_year ?? null,
      fundingStage: entry.company_profile.status?.stage ?? null,
      geographicOrigin: inferGeo(entry.company_profile.location),
      isActive: inferActive(entry.company_profile.status?.stage),
      shortDescription: clampShort(entry.metadata.similarity_vector_seed, 100),
      companySource: entry.reliability_evidence?.crunchbase ?? null,
      tags: Array.isArray(entry.metadata.industry_keywords)
        ? entry.metadata.industry_keywords
        : null,
      targetMarket: inferTargetMarket(entry.metadata.category, entry.metadata.sub_category),
      dataQualityScore: 70, // 시드 기본값 (verify 후 더 높게)
    };

    const deep = {
      problemStatement: entry.product_logic?.pain_point_mapping ?? null,
      solutionCore: entry.product_logic?.core_value_prop ?? null,
      initialWedge: entry.market_entry?.initial_user_acquisition?.method ?? null,
      signatureMoves: entry.product_logic?.pivot_moment ?? null,
      rawSeedData: {
        archive_link: entry.reliability_evidence?.archive_link ?? null,
        valuation_usd: entry.company_profile?.status?.valuation_usd ?? null,
        total_funding_usd: entry.company_profile?.status?.total_funding_usd ?? null,
        mvp_features: entry.product_logic?.mvp_scope?.features ?? null,
        tech_stack_hint: entry.product_logic?.tech_stack_hint ?? null,
        initial_channel: entry.market_entry?.initial_user_acquisition?.channel ?? null,
        initial_method: entry.market_entry?.initial_user_acquisition?.method ?? null,
        pivot_moment: entry.product_logic?.pivot_moment ?? null,
        beachhead_market: entry.market_entry?.beachhead_market ?? null,
      },
    };

    if (dry) {
      console.log(`[dry] ${name} → ${vectorDbId} (${meta.geographicOrigin ?? "?"})`);
      continue;
    }

    const existing = await prisma.globalCaseMeta.findUnique({
      where: { vectorDbId },
    });

    if (existing) {
      await prisma.globalCaseMeta.update({
        where: { vectorDbId },
        data: meta,
      });
      await prisma.globalCaseDeepAnalysis.upsert({
        where: { globalCaseMetaId: existing.id },
        create: { globalCaseMetaId: existing.id, ...deep },
        update: deep,
      });
      updated++;
    } else {
      const created = await prisma.globalCaseMeta.create({ data: meta });
      await prisma.globalCaseDeepAnalysis.create({
        data: { globalCaseMetaId: created.id, ...deep },
      });
      inserted++;
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  inserted: ${inserted}`);
  console.log(`  updated : ${updated}`);
  console.log(`  skipped : ${skipped}`);
  if (dry) console.log("  (dry-run, no DB writes)");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
