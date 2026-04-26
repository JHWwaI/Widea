import { type Prisma } from "@prisma/client";

export const IDEA_MATCH_GENERATION_VERSION = "idea-match-v2-ko";

type RawIdeaMatchIdea = Record<string, unknown> & {
  title?: unknown;
  titleKo?: unknown;
  oneLiner?: unknown;
  oneLinerKo?: unknown;
  summary?: unknown;
  summaryKo?: unknown;
  whyKorea?: unknown;
  whyNowInKorea?: unknown;
  whyNowInKoreaKo?: unknown;
  sourceBenchmark?: unknown;
  sourceBenchmarks?: unknown;
  feasibilityScore?: unknown;
  marketFitScore?: unknown;
  confidenceScore?: unknown;
  targetCustomer?: unknown;
  problemDetail?: unknown;
  businessModel?: unknown;
  revenueModel?: unknown;
  mvpScope?: unknown;
  goToMarket?: unknown;
  executionPlan?: unknown;
  roadmap?: unknown;
  estimatedCost?: unknown;
  risks?: unknown;
};

export type NormalizedGeneratedIdeaInput = {
  rank: number;
  status: "DRAFT";
  titleKo: string;
  oneLinerKo?: string;
  summaryKo?: string;
  whyNowInKoreaKo?: string;
  marketFitScore?: number;
  confidenceScore?: number;
  sourceBenchmarks?: Prisma.InputJsonValue;
  targetCustomer?: Prisma.InputJsonValue;
  problemDetail?: Prisma.InputJsonValue;
  businessModel?: Prisma.InputJsonValue;
  mvpScope?: Prisma.InputJsonValue;
  goToMarket?: Prisma.InputJsonValue;
  executionPlan?: Prisma.InputJsonValue;
  estimatedCost?: Prisma.InputJsonValue;
  risks?: Prisma.InputJsonValue;
  rawIdea: Prisma.InputJsonValue;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;

  const normalized = JSON.parse(JSON.stringify(value)) as unknown;
  if (normalized === undefined) return undefined;

  return normalized as Prisma.InputJsonValue;
}

function normalizeSourceBenchmarks(idea: RawIdeaMatchIdea): Prisma.InputJsonValue | undefined {
  if (Array.isArray(idea.sourceBenchmarks) && idea.sourceBenchmarks.length > 0) {
    return toJsonInput(idea.sourceBenchmarks);
  }

  if (typeof idea.sourceBenchmark === "string" && idea.sourceBenchmark.trim()) {
    const parsed = idea.sourceBenchmark
      .split(/,|\/|&|\|/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (parsed.length > 0) {
      return toJsonInput(parsed);
    }
  }

  return undefined;
}

export function normalizeGeneratedIdeas(payload: unknown): NormalizedGeneratedIdeaInput[] {
  const ideas =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { ideas?: unknown[] }).ideas)
      ? (payload as { ideas: unknown[] }).ideas
      : [];

  return ideas.map((entry, index) => {
    const idea: RawIdeaMatchIdea =
      entry && typeof entry === "object" ? (entry as RawIdeaMatchIdea) : {};

    const sourceBenchmarks = normalizeSourceBenchmarks(idea);
    const targetCustomer = toJsonInput(idea.targetCustomer);
    const problemDetail = toJsonInput(idea.problemDetail);
    const businessModel = toJsonInput(idea.businessModel ?? idea.revenueModel);
    const mvpScope = toJsonInput(idea.mvpScope);
    const goToMarket = toJsonInput(idea.goToMarket);
    const executionPlan = toJsonInput(idea.executionPlan ?? idea.roadmap);
    const estimatedCost = toJsonInput(idea.estimatedCost);
    const risks = toJsonInput(idea.risks);

    const marketFitScore = pickNumber(idea.marketFitScore, idea.feasibilityScore);
    const confidenceScore = pickNumber(idea.confidenceScore);

    return {
      rank: index + 1,
      status: "DRAFT" as const,
      titleKo: pickString(idea.titleKo, idea.title) ?? `아이디어 ${index + 1}`,
      ...(pickString(idea.oneLinerKo, idea.oneLiner)
        ? { oneLinerKo: pickString(idea.oneLinerKo, idea.oneLiner)! }
        : {}),
      ...(pickString(idea.summaryKo, idea.summary)
        ? { summaryKo: pickString(idea.summaryKo, idea.summary)! }
        : {}),
      ...(pickString(idea.whyNowInKoreaKo, idea.whyNowInKorea, idea.whyKorea)
        ? {
            whyNowInKoreaKo: pickString(
              idea.whyNowInKoreaKo,
              idea.whyNowInKorea,
              idea.whyKorea,
            )!,
          }
        : {}),
      ...(marketFitScore !== null ? { marketFitScore: clamp(marketFitScore, 0, 100) } : {}),
      ...(confidenceScore !== null ? { confidenceScore: clamp(confidenceScore, 0, 100) } : {}),
      ...(sourceBenchmarks ? { sourceBenchmarks } : {}),
      ...(targetCustomer ? { targetCustomer } : {}),
      ...(problemDetail ? { problemDetail } : {}),
      ...(businessModel ? { businessModel } : {}),
      ...(mvpScope ? { mvpScope } : {}),
      ...(goToMarket ? { goToMarket } : {}),
      ...(executionPlan ? { executionPlan } : {}),
      ...(estimatedCost ? { estimatedCost } : {}),
      ...(risks ? { risks } : {}),
      rawIdea: toJsonInput(idea) ?? {},
    };
  });
}
