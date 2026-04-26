import { type Express, type Request, type Response } from "express";
import { IdeaStatus, Prisma, type PrismaClient, type TargetMarket } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";

type RegisterProjectRoutesOptions = {
  prisma: PrismaClient;
};

const projectDetailInclude = {
  _count: { select: { ideaMatchSessions: true } },
  kBlueprints: {
    include: { globalCaseMeta: true },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.ProjectPolicyInclude;

type ProjectDetailRecord = Prisma.ProjectPolicyGetPayload<{
  include: typeof projectDetailInclude;
}>;

const syncIdeaInclude = {
  session: {
    select: {
      id: true,
      matchedCases: true,
      searchQuery: true,
    },
  },
} satisfies Prisma.GeneratedIdeaInclude;

type SyncIdeaRecord = Prisma.GeneratedIdeaGetPayload<{
  include: typeof syncIdeaInclude;
}>;

const WORKING_THESIS_HEADING = "Latest working thesis from Idea Match:";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (value === null || value === undefined) continue;
    const next = normalizeLabel(String(value));
    if (!next) continue;

    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(next);
  }

  return result;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value === "string" && value.trim()) {
    return uniqueStrings(value.split(/,|\n|\||\/|;/));
  }

  return [];
}

function mergeStringArrays(...groups: unknown[]): string[] {
  return uniqueStrings(groups.flatMap((group) => toStringArray(group)));
}

function readJsonString(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null;
  return pickString(value[key]);
}

function readJsonArrayLength(value: unknown, key: string): number {
  if (!isRecord(value) || !Array.isArray(value[key])) return 0;
  return value[key].filter(Boolean).length;
}

function serializeBlueprint(blueprint: ProjectDetailRecord["kBlueprints"][number]) {
  const localizationSummary = readJsonString(blueprint.localization, "summary");
  const regulationSummary = readJsonString(blueprint.regulations, "summary");
  const channelCount = readJsonArrayLength(blueprint.localization, "channels");
  const riskCount = readJsonArrayLength(blueprint.regulations, "risks");

  return {
    id: blueprint.id,
    feasibilityScore: blueprint.feasibilityScore,
    globalCase: {
      companyName: blueprint.globalCaseMeta.companyName,
      industry: blueprint.globalCaseMeta.industry,
    },
    localizationSummary,
    regulationSummary,
    altDesign: blueprint.altDesign,
    ...(channelCount > 0 ? { channelCount } : {}),
    ...(riskCount > 0 ? { riskCount } : {}),
    createdAt: blueprint.createdAt,
  };
}

function serializeProjectDetail(project: ProjectDetailRecord) {
  return {
    id: project.id,
    title: project.title,
    targetMarket: project.targetMarket,
    budgetLimit: project.budgetLimit?.toString() ?? null,
    targetDuration: project.targetDuration,
    coreCompetencies: project.coreCompetencies,
    industries: project.industries,
    problemKeywords: project.problemKeywords,
    revenueModelPref: project.revenueModelPref,
    targetCustomerAge: project.targetCustomerAge,
    blueprintCount: project.kBlueprints.length,
    ideaSessionCount: project._count.ideaMatchSessions,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    blueprints: project.kBlueprints.map(serializeBlueprint),
  };
}

async function getOwnedProjectDetail(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
): Promise<ProjectDetailRecord | null> {
  return prisma.projectPolicy.findFirst({
    where: { id: projectId, userId },
    include: projectDetailInclude,
  });
}

async function getSyncSourceIdea(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
): Promise<SyncIdeaRecord | null> {
  const baseWhere = {
    session: {
      is: {
        projectPolicyId: projectId,
        projectPolicy: {
          is: { userId },
        },
      },
    },
  } satisfies Prisma.GeneratedIdeaWhereInput;

  const selectedIdea = await prisma.generatedIdea.findFirst({
    where: {
      ...baseWhere,
      status: IdeaStatus.SELECTED,
    },
    orderBy: [{ updatedAt: "desc" }, { rank: "asc" }],
    include: syncIdeaInclude,
  });

  if (selectedIdea) return selectedIdea;

  return prisma.generatedIdea.findFirst({
    where: {
      ...baseWhere,
      status: IdeaStatus.SHORTLISTED,
    },
    orderBy: [{ updatedAt: "desc" }, { rank: "asc" }],
    include: syncIdeaInclude,
  });
}

function extractSourceBenchmarkNames(idea: SyncIdeaRecord): string[] {
  if (!Array.isArray(idea.sourceBenchmarks)) return [];

  return uniqueStrings(
    idea.sourceBenchmarks.map((entry) => {
      if (typeof entry === "string") return entry;
      if (isRecord(entry)) {
        return pickString(entry.companyName);
      }
      return "";
    }),
  );
}

function extractSourceBenchmarkIds(idea: SyncIdeaRecord): string[] {
  if (!Array.isArray(idea.sourceBenchmarks)) return [];

  return uniqueStrings(
    idea.sourceBenchmarks.map((entry) => {
      if (!isRecord(entry)) return "";
      return pickString(entry.globalCaseId);
    }),
  );
}

function parseMatchedCases(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => isRecord(entry));
}

function extractIdeaIndustries(idea: SyncIdeaRecord): string[] {
  const matchedCases = parseMatchedCases(idea.session.matchedCases);
  if (matchedCases.length === 0) return [];

  const sourceIds = new Set(extractSourceBenchmarkIds(idea).map((value) => value.toLowerCase()));
  const sourceNames = new Set(
    extractSourceBenchmarkNames(idea).map((value) => value.trim().toLowerCase()),
  );

  const referencedCases = matchedCases.filter((entry) => {
    const globalCaseId = pickString(entry.globalCaseMetaId)?.toLowerCase();
    const companyName = pickString(entry.companyName)?.toLowerCase();

    return Boolean(
      (globalCaseId && sourceIds.has(globalCaseId)) || (companyName && sourceNames.has(companyName)),
    );
  });

  const candidates = referencedCases.length > 0 ? referencedCases : matchedCases.slice(0, 3);
  return uniqueStrings(candidates.map((entry) => pickString(entry.industry)));
}

function extractIdeaRevenueModels(idea: SyncIdeaRecord): string[] {
  if (!isRecord(idea.businessModel)) return [];

  return uniqueStrings([
    pickString(idea.businessModel.modelKo),
    pickString(idea.businessModel.type),
    pickString(idea.businessModel.pricingKo),
  ]);
}

function extractIdeaTargetAge(idea: SyncIdeaRecord): string | null {
  if (!isRecord(idea.targetCustomer)) return null;

  return pickString(idea.targetCustomer.ageGroupKo, idea.targetCustomer.age);
}

function buildWorkingThesis(idea: SyncIdeaRecord): string {
  const targetCustomer = isRecord(idea.targetCustomer) ? idea.targetCustomer : null;
  const problemDetail = isRecord(idea.problemDetail) ? idea.problemDetail : null;
  const businessModel = isRecord(idea.businessModel) ? idea.businessModel : null;
  const sourceNames = extractSourceBenchmarkNames(idea);

  const lines = uniqueStrings([
    pickString(idea.oneLinerKo, idea.summaryKo, idea.titleKo, idea.session.searchQuery),
    targetCustomer
      ? [
          pickString(targetCustomer.personaKo, targetCustomer.persona),
          pickString(targetCustomer.corePainKo, targetCustomer.pain),
        ]
          .filter(Boolean)
          .join(" / ")
      : "",
    problemDetail
      ? [
          pickString(problemDetail.currentWorkflowKo),
          pickString(problemDetail.failureCostKo),
        ]
          .filter(Boolean)
          .join(" / ")
      : "",
    pickString(idea.whyNowInKoreaKo),
    businessModel
      ? [
          pickString(businessModel.modelKo, businessModel.type),
          pickString(businessModel.pricingKo),
        ]
          .filter(Boolean)
          .join(" / ")
      : "",
    sourceNames.length > 0 ? `Reference cases: ${sourceNames.join(", ")}` : "",
  ]);

  return lines.join("\n");
}

function mergeProblemKeywords(existing: string | null, nextThesis: string): string {
  const current = typeof existing === "string" ? existing.trim() : "";
  const withoutOldSync = current
    ? current.replace(/\n{2}Latest working thesis from Idea Match:\n[\s\S]*$/m, "").trim()
    : "";

  return withoutOldSync
    ? `${withoutOldSync}\n\n${WORKING_THESIS_HEADING}\n${nextThesis}`
    : `${WORKING_THESIS_HEADING}\n${nextThesis}`;
}

export function registerProjectRoutes(
  app: Express,
  { prisma }: RegisterProjectRoutesOptions,
): void {
  const TITLE_MAX = 120;
  const VALID_MARKETS: TargetMarket[] = ["B2B", "B2C", "B2B2C"];
  const DURATION_MAX = 200;
  const DEFAULT_PAGE_SIZE = 20;
  const MAX_PAGE_SIZE = 100;

  app.post("/api/projects", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const {
        title,
        targetMarket = "B2C",
        budgetLimit,
        targetDuration,
        coreCompetencies,
        // 새 설문 필드
        currentJob,
        industries,
        budgetRange,
        teamSize,
        commitment,
        launchTimeline,
        technicalSkills,
        domainExpertise,
        existingAssets,
        targetCustomerAge,
        revenueModelPref,
        riskTolerance,
        problemKeywords,
      } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        res.status(400).json({ errorCode: "MISSING_TITLE", error: "프로젝트 이름을 입력해주세요." });
        return;
      }
      if (title.trim().length > TITLE_MAX) {
        res.status(400).json({ errorCode: "TITLE_TOO_LONG", error: `프로젝트 이름은 ${TITLE_MAX}자 이하로 입력해주세요.` });
        return;
      }
      if (targetMarket && !VALID_MARKETS.includes(targetMarket)) {
        res.status(400).json({ errorCode: "INVALID_TARGET_MARKET", error: "유효한 타깃 마켓이 아닙니다: B2B, B2C, B2B2C" });
        return;
      }
      if (budgetLimit !== undefined && budgetLimit !== null) {
        const budget = Number(budgetLimit);
        if (isNaN(budget) || budget < 0) {
          res.status(400).json({ errorCode: "INVALID_BUDGET", error: "예산은 0 이상의 숫자여야 합니다." });
          return;
        }
      }

      const market = VALID_MARKETS.includes(targetMarket) ? targetMarket : "B2C";

      const project = await prisma.projectPolicy.create({
        data: {
          title: title.trim(),
          targetMarket: market,
          budgetLimit: budgetLimit ? BigInt(budgetLimit) : null,
          targetDuration: targetDuration || null,
          coreCompetencies: coreCompetencies || null,
          currentJob: currentJob || null,
          industries: industries || null,
          budgetRange: budgetRange || null,
          teamSize: teamSize || null,
          commitment: commitment || null,
          launchTimeline: launchTimeline || null,
          technicalSkills: technicalSkills || null,
          domainExpertise: domainExpertise || null,
          existingAssets: existingAssets || null,
          targetCustomerAge: targetCustomerAge || null,
          revenueModelPref: revenueModelPref || null,
          riskTolerance: riskTolerance || null,
          problemKeywords: problemKeywords || null,
          userId,
        },
      });

      console.log(`Created project "${title}" (${market})`);

      res.status(201).json({
        id: project.id,
        title: project.title,
        targetMarket: project.targetMarket,
        budgetLimit: project.budgetLimit?.toString() ?? null,
        targetDuration: project.targetDuration,
        coreCompetencies: project.coreCompetencies,
        blueprintCount: 0,
        ideaSessionCount: 0,
        createdAt: project.createdAt,
      });
    } catch (err) {
      handleRouteError(res, err, "Project create error");
    }
  });

  app.get("/api/projects", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE));
      const sortBy = req.query.sortBy === "title" ? "title" : "createdAt";
      const order = req.query.order === "asc" ? "asc" : "desc";
      const skip = (page - 1) * limit;

      const [projects, total] = await Promise.all([
        prisma.projectPolicy.findMany({
          where: { userId },
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
          include: { _count: { select: { kBlueprints: true, ideaMatchSessions: true } } },
        }),
        prisma.projectPolicy.count({ where: { userId } }),
      ]);

      res.json({
        projects: projects.map((project) => ({
          id: project.id,
          title: project.title,
          targetMarket: project.targetMarket,
          budgetLimit: project.budgetLimit?.toString() ?? null,
          targetDuration: project.targetDuration,
          blueprintCount: project._count.kBlueprints,
          ideaSessionCount: project._count.ideaMatchSessions,
          createdAt: project.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      handleRouteError(res, err, "Project list error");
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);

      const project = await getOwnedProjectDetail(prisma, id, userId);
      if (!project) {
        res.status(404).json({ errorCode: "PROJECT_NOT_FOUND", error: "프로젝트를 찾을 수 없습니다." });
        return;
      }

      res.json(serializeProjectDetail(project));
    } catch (err) {
      handleRouteError(res, err, "Project detail error");
    }
  });

  app.post(
    "/api/projects/:id/sync-selected-idea",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const id = String(req.params.id);

        const project = await prisma.projectPolicy.findFirst({
          where: { id, userId },
          select: {
            id: true,
            title: true,
            industries: true,
            problemKeywords: true,
            revenueModelPref: true,
            targetCustomerAge: true,
          },
        });

        if (!project) {
          res.status(404).json({ errorCode: "PROJECT_NOT_FOUND", error: "프로젝트를 찾을 수 없습니다." });
          return;
        }

        const sourceIdea = await getSyncSourceIdea(prisma, id, userId);
        if (!sourceIdea) {
          res.status(404).json({
            errorCode: "NO_SYNCED_IDEA",
            error: "이 프로젝트에 선택되거나 후보로 올린 아이디어가 아직 없습니다.",
          });
          return;
        }

        const workingThesis = buildWorkingThesis(sourceIdea);
        const industries = mergeStringArrays(project.industries, extractIdeaIndustries(sourceIdea));
        const revenueModelPref = mergeStringArrays(
          project.revenueModelPref,
          extractIdeaRevenueModels(sourceIdea),
        );
        const targetCustomerAge =
          pickString(project.targetCustomerAge) ?? extractIdeaTargetAge(sourceIdea);

        await prisma.projectPolicy.update({
          where: { id: project.id },
          data: {
            problemKeywords: mergeProblemKeywords(project.problemKeywords, workingThesis),
            ...(industries.length > 0 ? { industries } : {}),
            ...(revenueModelPref.length > 0 ? { revenueModelPref } : {}),
            ...(targetCustomerAge ? { targetCustomerAge } : {}),
          },
        });

        const refreshedProject = await getOwnedProjectDetail(prisma, id, userId);
        if (!refreshedProject) {
          res.status(404).json({ errorCode: "PROJECT_NOT_FOUND", error: "프로젝트를 찾을 수 없습니다." });
          return;
        }

        res.json({
          project: serializeProjectDetail(refreshedProject),
          sourceIdea: {
            id: sourceIdea.id,
            titleKo: sourceIdea.titleKo,
            status: sourceIdea.status,
          },
        });
      } catch (err) {
        handleRouteError(res, err, "Project brief sync error");
      }
    },
  );

  app.put("/api/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);
      const { title, targetMarket, budgetLimit, targetDuration, coreCompetencies } = req.body;

      if (title !== undefined && (typeof title !== "string" || !title.trim())) {
        res.status(400).json({ errorCode: "MISSING_TITLE", error: "프로젝트 이름을 입력해주세요." });
        return;
      }
      if (title !== undefined && title.trim().length > TITLE_MAX) {
        res.status(400).json({ errorCode: "TITLE_TOO_LONG", error: `프로젝트 이름은 ${TITLE_MAX}자 이하로 입력해주세요.` });
        return;
      }
      if (targetMarket !== undefined && !VALID_MARKETS.includes(targetMarket)) {
        res.status(400).json({ errorCode: "INVALID_TARGET_MARKET", error: "유효한 타깃 마켓이 아닙니다: B2B, B2C, B2B2C" });
        return;
      }
      if (budgetLimit !== undefined && budgetLimit !== null) {
        const budget = Number(budgetLimit);
        if (isNaN(budget) || budget < 0) {
          res.status(400).json({ errorCode: "INVALID_BUDGET", error: "예산은 0 이상의 숫자여야 합니다." });
          return;
        }
      }
      if (targetDuration !== undefined && typeof targetDuration === "string" && targetDuration.length > DURATION_MAX) {
        res.status(400).json({ errorCode: "DURATION_TOO_LONG", error: `목표 기간은 ${DURATION_MAX}자 이하로 입력해주세요.` });
        return;
      }

      const existing = await prisma.projectPolicy.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) {
        res.status(404).json({ errorCode: "PROJECT_NOT_FOUND", error: "프로젝트를 찾을 수 없습니다." });
        return;
      }

      const updated = await prisma.projectPolicy.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(targetMarket !== undefined && VALID_MARKETS.includes(targetMarket) && { targetMarket }),
          ...(budgetLimit !== undefined && { budgetLimit: budgetLimit ? BigInt(budgetLimit) : null }),
          ...(targetDuration !== undefined && { targetDuration: String(targetDuration) }),
          ...(coreCompetencies !== undefined && { coreCompetencies }),
        },
      });

      console.log(`Updated project "${updated.title}"`);

      res.json({
        id: updated.id,
        title: updated.title,
        targetMarket: updated.targetMarket,
        budgetLimit: updated.budgetLimit?.toString() ?? null,
        targetDuration: updated.targetDuration,
        coreCompetencies: updated.coreCompetencies,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      handleRouteError(res, err, "Project update error");
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const id = String(req.params.id);

      const existing = await prisma.projectPolicy.findFirst({
        where: { id, userId },
        include: { _count: { select: { kBlueprints: true, ideaMatchSessions: true } } },
      });
      if (!existing) {
        res.status(404).json({ errorCode: "PROJECT_NOT_FOUND", error: "프로젝트를 찾을 수 없습니다." });
        return;
      }

      await prisma.projectPolicy.delete({ where: { id } });

      console.log(`Deleted project "${existing.title}" (blueprints: ${existing._count.kBlueprints}, sessions: ${existing._count.ideaMatchSessions})`);

      res.json({
        deleted: true,
        id,
        removedBlueprints: existing._count.kBlueprints,
        removedSessions: existing._count.ideaMatchSessions,
      });
    } catch (err) {
      handleRouteError(res, err, "Project delete error");
    }
  });

  app.post("/api/quick-project", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        email = "test@widea.kr",
        title = "Test Project",
        targetMarket = "B2C",
        budget = 20_000_000,
      } = req.body;

      const validMarkets: TargetMarket[] = ["B2B", "B2C", "B2B2C"];
      const market = validMarkets.includes(targetMarket) ? targetMarket : "B2C";

      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email },
      });

      const policy = await prisma.projectPolicy.create({
        data: {
          title,
          targetMarket: market,
          budgetLimit: BigInt(budget),
          userId: user.id,
        },
      });

      console.log(`Created quick project "${title}" (${market})`);

      res.json({
        userId: user.id,
        projectPolicyId: policy.id,
        title,
        targetMarket: market,
        budget,
      });
    } catch (err) {
      handleRouteError(res, err, "Quick project create error");
    }
  });
}
