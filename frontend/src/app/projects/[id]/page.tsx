"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import ProjectJourney from "@/components/ProjectJourney";
import {
  Badge,
  EmptyState,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatCard,
  Surface,
} from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import {
  clampText,
  cx,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getProjectWorkflowState,
  parseJsonArray,
  readError,
} from "@/lib/product";
import type {
  GeneratedIdeaSummary,
  IdeaMatchCase,
  IdeaMatchSessionListResponse,
  ProjectDetailResponse,
  SyncProjectBriefResponse,
} from "@/lib/types";

type ActiveIdeaEntry = {
  sessionId: string;
  sessionCreatedAt: string;
  sessionQuery: string;
  idea: GeneratedIdeaSummary;
  caseId: string | null;
};

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  tone: "accent" | "success" | "warning" | "neutral";
  label: string;
  badges?: Array<{
    label: string;
    tone: "accent" | "success" | "warning" | "neutral";
  }>;
  href?: string;
  ctaLabel?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMatchCases(value: unknown): IdeaMatchCase[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is IdeaMatchCase => Boolean(entry) && typeof entry === "object");
}

function getIdeaPriority(status: string) {
  if (status === "SELECTED") return 0;
  if (status === "SHORTLISTED") return 1;
  return 2;
}

function getIdeaBadge(status: string): {
  label: string;
  tone: "accent" | "success" | "warning" | "neutral";
} {
  if (status === "SELECTED") return { label: "Selected", tone: "accent" };
  if (status === "SHORTLISTED") return { label: "Shortlisted", tone: "success" };
  if (status === "ARCHIVED") return { label: "Archived", tone: "warning" };
  return { label: "Draft", tone: "neutral" };
}

function resolveIdeaCaseId(idea: GeneratedIdeaSummary, matchedCases: IdeaMatchCase[]): string | null {
  if (Array.isArray(idea.sourceBenchmarks)) {
    for (const entry of idea.sourceBenchmarks) {
      if (entry && typeof entry === "object" && "globalCaseId" in entry) {
        const globalCaseId = (entry as { globalCaseId?: unknown }).globalCaseId;
        if (typeof globalCaseId === "string" && globalCaseId.trim()) {
          return globalCaseId.trim();
        }
      }
    }
  }

  const sourceNames = Array.isArray(idea.sourceBenchmarks)
    ? idea.sourceBenchmarks
        .map((entry) => {
          if (typeof entry === "string") return entry.trim().toLowerCase();
          if (isRecord(entry) && typeof entry.companyName === "string") {
            return entry.companyName.trim().toLowerCase();
          }
          return "";
        })
        .filter(Boolean)
    : [];

  if (sourceNames.length > 0) {
    const matched = matchedCases.find((entry) => {
      const companyName = entry.companyName?.trim().toLowerCase();
      return companyName ? sourceNames.includes(companyName) : false;
    });

    if (matched?.globalCaseMetaId) {
      return matched.globalCaseMetaId;
    }
  }

  return matchedCases.find((entry) => Boolean(entry.globalCaseMetaId))?.globalCaseMetaId ?? null;
}

function buildBlueprintTimelineDescription(blueprint: ProjectDetailResponse["blueprints"][number]) {
  const primaryNarrative =
    blueprint.localizationSummary || blueprint.regulationSummary || blueprint.altDesign;
  const supportingNotes = [
    typeof blueprint.channelCount === "number" && blueprint.channelCount > 0
      ? `${blueprint.channelCount} local channels identified`
      : "",
    typeof blueprint.riskCount === "number" && blueprint.riskCount > 0
      ? `${blueprint.riskCount} key risks flagged`
      : "",
  ].filter(Boolean);

  return [primaryNarrative, supportingNotes.join(" / "), `Feasibility ${blueprint.feasibilityScore}/100`]
    .filter(Boolean)
    .join(". ");
}

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token } = useAuth();
  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [sessions, setSessions] = useState<IdeaMatchSessionListResponse["sessions"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncingBrief, setSyncingBrief] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!token || !projectId) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setSyncFeedback(null);

    Promise.all([
      api<ProjectDetailResponse>("GET", `/api/projects/${projectId}`, undefined, token),
      api<IdeaMatchSessionListResponse>(
        "GET",
        buildQuery("/api/idea-match/sessions", { projectId, limit: 6 }),
        undefined,
        token,
      ),
    ])
      .then(([projectResponse, sessionResponse]) => {
        if (cancelled) return;
        setProject(projectResponse);
        setSessions(sessionResponse.sessions);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(readError(caught, "Project workspace could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, token]);

  const workflow = useMemo(() => {
    if (!project || !projectId) return null;
    return getProjectWorkflowState({
      projectId,
      blueprintCount: project.blueprints.length,
      ideaSessionCount: project.ideaSessionCount ?? sessions.length,
    });
  }, [project, projectId, sessions.length]);

  const competencies = parseJsonArray(project?.coreCompetencies);
  const industries = parseJsonArray(project?.industries);
  const revenueModels = parseJsonArray(project?.revenueModelPref);
  const activeIdeas = useMemo(() => {
    return sessions
      .flatMap((session) => {
        const matchedCases = normalizeMatchCases(session.matchedCases);
        return (session.generatedIdeas ?? []).map((idea) => ({
          sessionId: session.id,
          sessionCreatedAt: session.createdAt,
          sessionQuery: session.searchQuery,
          idea,
          caseId: resolveIdeaCaseId(idea, matchedCases),
        }));
      })
      .sort((left, right) => {
        const priorityGap = getIdeaPriority(left.idea.status) - getIdeaPriority(right.idea.status);
        if (priorityGap !== 0) return priorityGap;

        const rightTime = new Date(right.idea.updatedAt ?? right.sessionCreatedAt).getTime();
        const leftTime = new Date(left.idea.updatedAt ?? left.sessionCreatedAt).getTime();
        return rightTime - leftTime;
      });
  }, [sessions]);

  const selectedIdeaCount = activeIdeas.filter((entry) => entry.idea.status === "SELECTED").length;
  const primaryIdea = activeIdeas[0] ?? null;
  const workingThesis = useMemo(() => {
    const savedThesis = project?.problemKeywords?.trim();
    if (savedThesis) return savedThesis;
    if (!primaryIdea) return "";

    const previewLines = [
      "Preview thesis from the current leading idea:",
      primaryIdea.idea.oneLinerKo || primaryIdea.idea.titleKo,
      `Idea Match prompt: ${clampText(primaryIdea.sessionQuery, 140)}`,
    ].filter(Boolean);

    return previewLines.join("\n");
  }, [primaryIdea, project?.problemKeywords]);

  const timeline = useMemo(() => {
    if (!project) return [] as TimelineItem[];

    const ideaEntries: TimelineItem[] = activeIdeas.map((entry) => {
      const badge = getIdeaBadge(entry.idea.status);
      return {
        id: `idea-${entry.idea.id}`,
        date: entry.idea.updatedAt ?? entry.sessionCreatedAt,
        title: entry.idea.titleKo,
        description: entry.idea.oneLinerKo || clampText(entry.sessionQuery, 120),
        tone: badge.tone,
        label: badge.label,
        ...(entry.caseId
          ? {
              href: `/blueprint?projectId=${project.id}&caseId=${entry.caseId}`,
              ctaLabel: "Open Blueprint",
            }
          : {
              href: `/idea-match?projectId=${project.id}`,
              ctaLabel: "Open Idea Match",
            }),
      };
    });

    const blueprintEntries: TimelineItem[] = project.blueprints.map((blueprint) => ({
      id: `blueprint-${blueprint.id}`,
      date: blueprint.createdAt,
      title: blueprint.globalCase.companyName,
      description: buildBlueprintTimelineDescription(blueprint),
      tone: "accent",
      label: "Blueprint",
      badges: [
        { label: `Fit ${blueprint.feasibilityScore}/100`, tone: "accent" as const },
        ...(typeof blueprint.channelCount === "number" && blueprint.channelCount > 0
          ? [{ label: `${blueprint.channelCount} channels`, tone: "success" as const }]
          : []),
        ...(typeof blueprint.riskCount === "number" && blueprint.riskCount > 0
          ? [{ label: `${blueprint.riskCount} risks`, tone: "warning" as const }]
          : []),
      ],
      href: `/blueprint?projectId=${project.id}`,
      ctaLabel: "Open Blueprint",
    }));

    return [...ideaEntries, ...blueprintEntries]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 8);
  }, [activeIdeas, project]);

  const shortcutSteps =
    project && workflow
      ? [
          {
            key: "brief",
            title: "Project brief",
            description: "Review the current project context and saved competencies.",
            href: "#project-brief",
          },
          {
            key: "discovery",
            title: "Discovery",
            description: "Research comparable companies and define the market direction.",
            href: `/discovery?projectId=${project.id}`,
          },
          {
            key: "blueprint",
            title: "Blueprint",
            description: "Turn benchmark insights into a localized execution strategy.",
            href: `/blueprint?projectId=${project.id}`,
          },
          {
            key: "ideaMatch",
            title: "Idea Match",
            description: "Explore startup directions that fit budget, timing, and skills.",
            href: `/idea-match?projectId=${project.id}`,
          },
        ].map((item) => ({
          ...item,
          status: workflow.steps.find((step) => step.key === item.key)?.status ?? "upcoming",
        }))
      : [];

  async function handleSyncBrief() {
    if (!token || !project) return;

    setSyncingBrief(true);
    setSyncFeedback(null);

    try {
      const response = await api<SyncProjectBriefResponse>(
        "POST",
        `/api/projects/${project.id}/sync-selected-idea`,
        {},
        token,
      );

      setProject(response.project);
      setSyncFeedback({
        tone: "success",
        message: `Project brief updated from "${response.sourceIdea.titleKo}".`,
      });
    } catch (caught) {
      setSyncFeedback({
        tone: "warning",
        message: readError(caught, "Project brief could not be synced."),
      });
    } finally {
      setSyncingBrief(false);
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="Project workspace"
          title={project?.title || "Project workspace"}
          description="A workflow-first view of this project: current status, recent outputs, and the single clearest next move."
          badge={workflow ? <Badge tone="accent">{workflow.stageLabel}</Badge> : undefined}
          actions={
            project && workflow ? (
              <>
                <Link href={workflow.nextAction.href} className="btn-primary">
                  {workflow.nextAction.label}
                </Link>
                <Link href="/projects" className="btn-secondary">
                  Back to Projects
                </Link>
              </>
            ) : undefined
          }
        />

        {error ? (
          <Surface
            className="border-red-100 bg-red-50 text-red-700"
            role="alert"
          >
            {error}
          </Surface>
        ) : null}

        {loading ? (
          <LoadingState label="Loading project workspace..." />
        ) : !project || !workflow ? (
          <EmptyState
            title="Project not found"
            description="This project may have been deleted or is no longer available in your workspace."
            action={
              <Link href="/projects" className="btn-primary">
                Back to Projects
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Progress"
                value={`${workflow.completionPercent}%`}
                hint={`${workflow.completedCount} of ${workflow.steps.length} workflow stages are complete.`}
                tone="accent"
              />
              <StatCard
                label="Blueprints"
                value={project.blueprints.length}
                hint="Localized execution plans created from benchmark cases."
              />
              <StatCard
                label="Idea sessions"
                value={project.ideaSessionCount ?? sessions.length}
                hint="Idea Match sessions linked to this project."
                tone="warm"
              />
              <StatCard
                label="Selected ideas"
                value={selectedIdeaCount}
                hint={
                  primaryIdea
                    ? `${clampText(primaryIdea.idea.titleKo, 42)} is the current leading direction.`
                    : "No saved direction yet."
                }
              />
              <StatCard
                label="Budget"
                value={formatCurrency(project.budgetLimit)}
                hint={project.targetDuration || "No target timeline has been set yet."}
              />
            </div>

            <ProjectJourney workflow={workflow} />

            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <Surface id="project-brief" className="space-y-5">
                <SectionHeader
                  eyebrow="Project brief"
                  title="Current project context"
                  description="Keep the brief concise so the team can scan it quickly before taking the next step."
                  action={
                    primaryIdea ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleSyncBrief}
                        disabled={syncingBrief}
                      >
                        {syncingBrief ? "Syncing brief..." : "Sync Selected Idea"}
                      </button>
                    ) : undefined
                  }
                />

                {syncFeedback ? (
                  <div
                    className={cx(
                      "rounded-xl border px-4 py-3 text-sm leading-6",
                      syncFeedback.tone === "success"
                        ? "border-[rgba(84,146,103,0.18)] bg-[rgba(237,247,241,0.92)] text-[rgb(54,102,71)]"
                        : "border-[rgba(214,145,67,0.2)] bg-[rgba(255,247,235,0.94)] text-[rgb(140,88,40)]",
                    )}
                    role={syncFeedback.tone === "success" ? "status" : "alert"}
                  >
                    {syncFeedback.message}
                  </div>
                ) : null}

                <dl className="grid gap-3">
                  {[
                    ["Target market", project.targetMarket],
                    ["Budget", formatCurrency(project.budgetLimit)],
                    ["Timeline", project.targetDuration || "Not set"],
                    ["Created", formatDate(project.createdAt)],
                    ["Last updated", project.updatedAt ? formatRelativeTime(project.updatedAt) : "Not available"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3"
                    >
                      <dt className="text-sm text-gray-400">{label}</dt>
                      <dd className="text-sm font-semibold text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Working thesis
                    </p>
                    <Badge tone={project.problemKeywords ? "accent" : primaryIdea ? "warning" : "neutral"}>
                      {project.problemKeywords
                        ? "Saved in brief"
                        : primaryIdea
                          ? "Ready to sync"
                          : "No thesis yet"}
                    </Badge>
                  </div>
                  {workingThesis ? (
                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
                      <p className="whitespace-pre-line text-sm leading-7 text-gray-500">
                        {workingThesis}
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-100 bg-white/45 px-4 py-3 text-sm leading-7 text-gray-500">
                      Select or shortlist an idea in Idea Match to seed a clearer project thesis here.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Focus industries
                    </p>
                    {industries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {industries.map((industry) => (
                          <span key={industry} className="chip">
                            {industry}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-gray-100 bg-white/45 px-4 py-3 text-sm leading-7 text-gray-500">
                        Sync a saved idea to populate the most relevant industries for this project.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Revenue preferences
                    </p>
                    {revenueModels.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {revenueModels.map((model) => (
                          <span key={model} className="chip">
                            {model}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-gray-100 bg-white/45 px-4 py-3 text-sm leading-7 text-gray-500">
                        No monetization preference is saved yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    Target customer age
                  </p>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {project.targetCustomerAge || "Not defined yet"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    Core competencies
                  </p>
                  {competencies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {competencies.map((competency) => (
                        <span key={competency} className="chip">
                          {competency}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-100 bg-white/45 px-4 py-3 text-sm leading-7 text-gray-500">
                      No competencies have been saved yet. Add them when you refine the project brief.
                    </p>
                  )}
                </div>

                <nav aria-label="Workflow shortcuts" className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    Workflow shortcuts
                  </p>
                  <div className="grid gap-3">
                    {shortcutSteps.map((item) => {
                      const badgeTone =
                        item.status === "done"
                          ? "success"
                          : item.status === "current"
                            ? "warning"
                            : "neutral";
                      const badgeLabel =
                        item.status === "done"
                          ? "Done"
                          : item.status === "current"
                            ? "Current"
                            : "Upcoming";

                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          aria-current={item.status === "current" ? "step" : undefined}
                          className={cx(
                            "group flex min-h-[72px] items-center justify-between gap-4 rounded-xl border px-4 py-3 transition",
                            item.status === "current"
                              ? "border-[rgba(231,140,71,0.24)] bg-[rgba(255,245,236,0.88)]"
                              : "border-gray-100 bg-white hover:bg-white/82",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                              <Badge tone={badgeTone}>{badgeLabel}</Badge>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-gray-500">
                              {item.description}
                            </p>
                          </div>
                          <span className="text-xs uppercase tracking-wider text-gray-400 group-hover:text-gray-900">
                            Open
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              </Surface>

              <div className="grid gap-4">
                <Surface className="space-y-5">
                  <SectionHeader
                    eyebrow="Selected direction"
                    title="Current startup bet"
                    description="Show the idea this project is currently leaning toward, plus the clearest next action."
                    action={
                      <div className="flex items-center gap-2">
                        <Badge tone={primaryIdea ? getIdeaBadge(primaryIdea.idea.status).tone : "neutral"}>
                          {primaryIdea ? getIdeaBadge(primaryIdea.idea.status).label : "No saved idea"}
                        </Badge>
                        <Link href={`/idea-match?projectId=${project.id}`} className="btn-ghost px-4 py-2 text-sm">
                          Open Idea Match
                        </Link>
                      </div>
                    }
                  />

                  {!primaryIdea ? (
                    <EmptyState
                      title="No saved direction yet"
                      description="Once an idea is selected or shortlisted in Idea Match, the leading direction for this project will appear here."
                      action={
                        <Link href={`/idea-match?projectId=${project.id}`} className="btn-secondary">
                          Run Idea Match
                        </Link>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      <article className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/ideas/${primaryIdea.idea.id}`}>
                                <h3 className="text-base font-semibold text-gray-900 hover:text-blue-600">
                                  {primaryIdea.idea.titleKo}
                                </h3>
                              </Link>
                              <Badge tone={getIdeaBadge(primaryIdea.idea.status).tone}>
                                {getIdeaBadge(primaryIdea.idea.status).label}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-gray-500">
                              {primaryIdea.idea.oneLinerKo || clampText(primaryIdea.sessionQuery, 160)}
                            </p>
                          </div>
                          {typeof primaryIdea.idea.marketFitScore === "number" ? (
                            <Badge tone="accent">Fit {primaryIdea.idea.marketFitScore}/100</Badge>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{formatRelativeTime(primaryIdea.idea.updatedAt ?? primaryIdea.sessionCreatedAt)}</Badge>
                          <Badge tone="warning">Session prompt</Badge>
                          <span className="text-sm text-gray-500">
                            {clampText(primaryIdea.sessionQuery, 90)}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link href={`/ideas/${primaryIdea.idea.id}`} className="btn-primary">
                            아이디어 워크스페이스 열기
                          </Link>
                          {primaryIdea.caseId ? (
                            <Link
                              href={`/blueprint?projectId=${project.id}&caseId=${primaryIdea.caseId}`}
                              className="btn-secondary"
                            >
                              Blueprint 만들기
                            </Link>
                          ) : null}
                          <Link href={`/idea-match?projectId=${project.id}`} className="btn-ghost">
                            다른 아이디어 탐색
                          </Link>
                        </div>
                      </article>

                      {activeIdeas.length > 1 ? (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-wider text-gray-400">
                            Additional saved directions
                          </p>
                          <div className="grid gap-3">
                            {activeIdeas.slice(1, 4).map((entry) => (
                              <article
                                key={entry.idea.id}
                                className="rounded-xl border border-gray-100 bg-white/55 px-4 py-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {entry.idea.titleKo}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-gray-500">
                                      {entry.idea.oneLinerKo || clampText(entry.sessionQuery, 110)}
                                    </p>
                                  </div>
                                  <Badge tone={getIdeaBadge(entry.idea.status).tone}>
                                    {getIdeaBadge(entry.idea.status).label}
                                  </Badge>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </Surface>

                <Surface className="space-y-5">
                  <SectionHeader
                    eyebrow="Strategy timeline"
                    title="Recent decisions and outputs"
                    description="Ideas and blueprints should read like one continuous execution trail, not separate tools."
                    action={<Badge tone="neutral">{timeline.length} items</Badge>}
                  />

                  {timeline.length === 0 ? (
                    <EmptyState
                      title="No timeline yet"
                      description="Run Idea Match or create a Blueprint to start building the project timeline."
                    />
                  ) : (
                    <div className="grid gap-3">
                      {timeline.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-xl border border-gray-100 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <Badge tone={item.tone}>{item.label}</Badge>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-gray-500">
                                {item.description}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(item.date)}
                            </span>
                          </div>
                          {item.badges && item.badges.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.badges.map((badge) => (
                                <Badge key={`${item.id}-${badge.label}`} tone={badge.tone}>
                                  {badge.label}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {item.href && item.ctaLabel ? (
                            <div className="mt-4">
                              <Link href={item.href} className="btn-ghost px-4 py-2 text-sm">
                                {item.ctaLabel}
                              </Link>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </Surface>

                <Surface className="space-y-5">
                  <SectionHeader
                    eyebrow="Idea sessions"
                    title="Recent founder-fit runs"
                    description="Recent prompts and match counts should be easy to review before starting another session."
                    action={
                      <div className="flex items-center gap-2">
                        <Badge tone="warning">{sessions.length} loaded</Badge>
                        <Link href={`/idea-match?projectId=${project.id}`} className="btn-ghost px-4 py-2 text-sm">
                          Open Idea Match
                        </Link>
                      </div>
                    }
                  />

                  {sessions.length === 0 ? (
                    <EmptyState
                      title="No idea session yet"
                      description="Once Idea Match runs for this project, the search history and recent prompts will appear here."
                      action={
                        <Link href={`/idea-match?projectId=${project.id}`} className="btn-secondary">
                          Run Idea Match
                        </Link>
                      }
                    />
                  ) : (
                    <div className="grid gap-3">
                      {sessions.map((session) => (
                        <article
                          key={session.id}
                          className="rounded-xl border border-gray-100 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {session.projectPolicy.title}
                            </h3>
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(session.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-gray-500">
                            {clampText(session.searchQuery, 180)}
                          </p>
                          {session.generatedIdeas && session.generatedIdeas.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {session.generatedIdeas.slice(0, 2).map((idea) => (
                                <Badge key={idea.id} tone={getIdeaBadge(idea.status).tone}>
                                  {getIdeaBadge(idea.status).label}: {clampText(idea.titleKo, 28)}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-3 text-xs uppercase tracking-wider text-gray-400">
                            Matched {Array.isArray(session.matchedCases) ? session.matchedCases.length : 0} cases
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </Surface>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
