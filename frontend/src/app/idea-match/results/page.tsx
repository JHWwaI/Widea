"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { Badge, EmptyState, LoadingState, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import type {
  GeneratedIdea,
  IdeaCard,
  IdeaMatchCase,
  IdeaMatchSessionDetailResponse,
  UpdateGeneratedIdeaStatusResponse,
} from "@/lib/types";

/* ── Helper functions ── */

function toIdeaCardFromGeneratedIdea(idea: GeneratedIdea): IdeaCard {
  const sourceBenchmark = Array.isArray(idea.sourceBenchmarks)
    ? idea.sourceBenchmarks
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "companyName" in item) {
            return typeof (item as { companyName?: unknown }).companyName === "string"
              ? (item as { companyName: string }).companyName
              : null;
          }
          return null;
        })
        .filter((item): item is string => Boolean(item))
        .join(", ")
    : undefined;

  return {
    title: idea.titleKo,
    summary: idea.oneLinerKo || idea.summaryKo || undefined,
    whyNowInKorea: idea.whyNowInKoreaKo || undefined,
    sourceBenchmark,
    feasibilityScore: idea.marketFitScore ?? undefined,
    confidenceScore: idea.confidenceScore ?? undefined,
    targetCustomer: idea.targetCustomer ?? undefined,
    problemDetail: idea.problemDetail ?? undefined,
    businessModel: idea.businessModel ?? undefined,
    mvpScope: idea.mvpScope ?? undefined,
    goToMarket: idea.goToMarket ?? undefined,
    executionPlan: idea.executionPlan ?? undefined,
    estimatedCost: idea.estimatedCost ?? undefined,
    risks: Array.isArray(idea.risks) ? (idea.risks as IdeaCard["risks"]) : undefined,
  };
}

function getIdeaScoreLabel(idea: IdeaCard, index: number) {
  const raw = typeof idea.feasibilityScore === "number" ? idea.feasibilityScore : NaN;
  const value = Number.isFinite(raw) ? Math.max(0, Math.min(10, raw / 10)) : Math.max(7.2, 9.2 - index * 0.4);
  return value.toFixed(1);
}

function getIdeaHighlight(idea: IdeaCard) {
  if (typeof idea.whyNowInKorea === "string" && idea.whyNowInKorea.trim()) return idea.whyNowInKorea;
  if (typeof idea.whyKorea === "string" && idea.whyKorea.trim()) return idea.whyKorea;
  return idea.summary || "";
}

function getIdeaBenchmarks(idea: IdeaCard, fallback: string[]) {
  const source = typeof idea.sourceBenchmark === "string" ? idea.sourceBenchmark : "";
  const parsed = source.split(/,|\/|&|\|/).map((s) => s.trim()).filter(Boolean);
  return (parsed.length > 0 ? parsed : fallback).slice(0, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function readRecordText(source: unknown, keys: string[]): string | null {
  if (typeof source === "string" && source.trim()) return source.trim();
  if (!isRecord(source)) return null;
  for (const key of keys) {
    const v = source[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function buildMetrics(source: unknown, config: Array<{ label: string; keys: string[] }>): Array<{ label: string; value: string }> {
  if (typeof source === "string" && source.trim()) return [{ label: "상세 내용", value: source.trim() }];
  if (!isRecord(source)) return [];
  return config
    .map((e) => { const v = readRecordText(source, e.keys); return v ? { label: e.label, value: v } : null; })
    .filter((e): e is { label: string; value: string } => Boolean(e));
}

function resolveBlueprintCaseId(idea: GeneratedIdea | null, matchedCases: IdeaMatchCase[]): string | null {
  if (idea && Array.isArray(idea.sourceBenchmarks)) {
    for (const entry of idea.sourceBenchmarks) {
      if (entry && typeof entry === "object" && "globalCaseId" in entry) {
        const id = (entry as { globalCaseId?: unknown }).globalCaseId;
        if (typeof id === "string" && id.trim()) return id.trim();
      }
    }
  }
  return matchedCases.find((e) => Boolean(e.globalCaseMetaId))?.globalCaseMetaId ?? null;
}

const CARD_COLORS = [
  { bg: "from-blue-50 to-white", border: "border-blue-200", accent: "text-blue-700", icon: "bg-blue-100 text-blue-600" },
  { bg: "from-violet-50 to-white", border: "border-violet-200", accent: "text-violet-700", icon: "bg-violet-100 text-violet-600" },
  { bg: "from-amber-50 to-white", border: "border-amber-200", accent: "text-amber-700", icon: "bg-amber-100 text-amber-600" },
];

/* ── Page ── */

export default function IdeaMatchResultsPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { token, user, updateCredit } = useAuth();
  const [session, setSession] = useState<IdeaMatchSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [unlockedIndexes, setUnlockedIndexes] = useState<Set<number>>(new Set([0]));
  const [unlockingIndex, setUnlockingIndex] = useState<number | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;
    setLoading(true);

    api<IdeaMatchSessionDetailResponse>("GET", `/api/idea-match/sessions/${sessionId}`, undefined, token)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        // DB에서 requiresCredit: false 인 아이디어는 이미 언락된 것으로 처리
        const unlockedSet = new Set<number>(
          (data.generatedIdeas ?? []).reduce<number[]>((acc, idea, i) => {
            if (!idea.requiresCredit) acc.push(i);
            return acc;
          }, []),
        );
        // 최소한 첫 번째는 항상 열림
        unlockedSet.add(0);
        setUnlockedIndexes(unlockedSet);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "세션을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token, sessionId]);

  const generatedIdeas = session?.generatedIdeas ?? [];
  const ideaCards = generatedIdeas.map(toIdeaCardFromGeneratedIdea);
  const matchedCases: IdeaMatchCase[] = Array.isArray(session?.matchedCases) ? session.matchedCases : [];
  const activeIdea = ideaCards[selectedIndex] ?? null;
  const activeGenerated = generatedIdeas[selectedIndex] ?? null;
  const projectId = session?.projectPolicy?.id ?? "";
  const projectTitle = session?.projectPolicy?.title ?? "";
  const blueprintCaseId = resolveBlueprintCaseId(activeGenerated, matchedCases);

  const businessModelItems = activeIdea
    ? buildMetrics(activeGenerated?.businessModel ?? activeIdea.businessModel, [
        { label: "수익 모델", keys: ["modelKo", "type"] },
        { label: "가격 가설", keys: ["pricingKo", "pricing"] },
      ])
    : [];
  const targetCustomerItems = activeIdea
    ? buildMetrics(activeGenerated?.targetCustomer ?? activeIdea.targetCustomer, [
        { label: "핵심 페르소나", keys: ["personaKo", "persona"] },
        { label: "주요 문제", keys: ["corePainKo", "pain"] },
      ])
    : [];

  async function handleUnlock(index: number) {
    const ideaId = generatedIdeas[index]?.id;
    if (!token || !ideaId) return;
    setUnlockingIndex(index);
    setUnlockError("");
    try {
      const res = await api<{ idea: { id: string; requiresCredit: boolean }; creditBalance: number }>(
        "POST", `/api/ideas/${ideaId}/unlock`, {}, token,
      );
      updateCredit(res.creditBalance);
      setUnlockedIndexes((prev) => new Set([...prev, index]));
      setSelectedIndex(index);
    } catch (caught) {
      setUnlockError(readError(caught, "잠금 해제에 실패했습니다."));
    } finally {
      setUnlockingIndex(null);
    }
  }

  async function handleStatusChange(status: "SELECTED" | "SHORTLISTED") {
    if (!token || !activeGenerated) return;
    try {
      setStatusUpdating(true);
      setStatusMessage("");
      const response = await api<UpdateGeneratedIdeaStatusResponse>(
        "PATCH",
        `/api/idea-match/ideas/${activeGenerated.id}/status`,
        { status },
        token,
      );
      setSession((prev) =>
        prev
          ? {
              ...prev,
              generatedIdeas: prev.generatedIdeas?.map((idea) =>
                idea.id === response.idea.id ? { ...idea, status: response.idea.status } : idea,
              ),
            }
          : prev,
      );
      setStatusMessage(status === "SELECTED" ? "프로젝트 대표안으로 저장됨" : "Shortlist에 저장됨");
    } catch (caught) {
      setError(readError(caught, "상태 저장에 실패했습니다."));
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState label="아이디어를 불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !session) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-2xl space-y-4 py-20 text-center">
          <p className="text-red-600">{error || "세션을 찾을 수 없습니다."}</p>
          <Link href="/idea-match" className="btn-primary">다시 탐색하기</Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="fade-up mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">추천 결과</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {projectTitle || "아이디어 탐색 결과"}
            </h1>
            <p className="text-sm text-gray-500">
              해외 성공 사례 {matchedCases.length}건을 분석해 맞춤 아이디어를 생성했습니다
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/idea-match" className="btn-secondary text-sm">새 탐색</Link>
            <Link href="/mypage" className="btn-ghost text-sm">My Page</Link>
          </div>
        </div>

        {/* Idea Cards */}
        {ideaCards.length === 0 ? (
          <EmptyState title="생성된 아이디어가 없습니다" description="다시 탐색을 시도해보세요." />
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {ideaCards.map((idea, index) => {
              const color = CARD_COLORS[index % CARD_COLORS.length];
              const isUnlocked = unlockedIndexes.has(index);
              const isActive = index === selectedIndex;
              const status = generatedIdeas[index]?.status ?? "DRAFT";
              const unlockCost = 5;
              const canUnlock = (user?.creditBalance ?? 0) >= unlockCost || user?.isAdmin;

              return (
                <div
                  key={`idea-${index}`}
                  className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b ${color.bg} p-6 shadow-sm transition ${
                    isActive && isUnlocked ? `${color.border} ring-2 ring-blue-100` : "border-gray-200"
                  }`}
                >
                  {/* Blur overlay for locked cards */}
                  {!isUnlocked ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-md">
                      <div className="rounded-full bg-gray-100 p-3">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">잠긴 아이디어</p>
                      <p className="text-xs text-gray-500">{unlockCost} 크레딧으로 열기</p>
                      {canUnlock ? (
                        <button
                          type="button"
                          onClick={() => handleUnlock(index)}
                          disabled={unlockingIndex === index}
                          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {unlockingIndex === index ? "처리 중..." : `잠금 해제 (${unlockCost} cr)`}
                        </button>
                      ) : (
                        <Link href="/pricing" className="rounded-lg bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-300">
                          크레딧 충전
                        </Link>
                      )}
                    </div>
                  ) : null}

                  {/* Score */}
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${color.icon}`}>
                      {index + 1}
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Market fit</p>
                      <p className="text-xl font-bold text-emerald-600">{getIdeaScoreLabel(idea, index)}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mt-4 space-y-2">
                    <h3 className="text-base font-bold text-gray-900">{idea.title || `Idea ${index + 1}`}</h3>
                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">
                      {getIdeaHighlight(idea) || "핵심 가치 제안"}
                    </p>
                  </div>

                  {/* Benchmarks */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {status === "SELECTED" ? <Badge tone="accent">Selected</Badge> : null}
                    {status === "SHORTLISTED" ? <Badge tone="success">Shortlisted</Badge> : null}
                    {getIdeaBenchmarks(idea, []).map((b) => (
                      <span key={b} className="rounded bg-gray-100 px-2 py-0.5 text-[0.6875rem] text-gray-500">{b}</span>
                    ))}
                  </div>

                  {/* Select button */}
                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition ${
                        isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {isActive ? "선택됨" : "자세히 보기"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Selected idea detail */}
        {activeIdea && !loading ? (
          <Surface className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">상세 분석</p>
                <h2 className="text-xl font-bold text-gray-900">{activeIdea.title}</h2>
                <p className="max-w-2xl text-sm text-gray-500">
                  {activeIdea.summary || getIdeaHighlight(activeIdea)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">Fit {getIdeaScoreLabel(activeIdea, selectedIndex)} / 10</Badge>
                {typeof activeIdea.confidenceScore === "number" ? (
                  <Badge tone="success">Confidence {(activeIdea.confidenceScore / 10).toFixed(1)}</Badge>
                ) : null}
              </div>
            </div>

            {/* Key metrics */}
            {targetCustomerItems.length > 0 || businessModelItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {targetCustomerItems.length > 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">타깃 고객</p>
                    <div className="mt-2 space-y-2">
                      {targetCustomerItems.map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="text-sm text-gray-900">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {businessModelItems.length > 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">수익 모델</p>
                    <div className="mt-2 space-y-2">
                      {businessModelItems.map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-gray-400">{item.label}</p>
                          <p className="text-sm text-gray-900">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Why Korea */}
            {getIdeaHighlight(activeIdea) ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">왜 지금 한국에서 맞는가</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-900">{getIdeaHighlight(activeIdea)}</p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">다음 단계</p>
              {unlockError ? (
                <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{unlockError}</div>
              ) : null}
              {statusMessage ? (
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-emerald-600">{statusMessage}</p>
                  {activeGenerated ? (
                    <Link href={`/ideas/${activeGenerated.id}`} className="btn-primary text-sm">
                      아이디어 워크스페이스 열기 →
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleStatusChange("SELECTED")}
                  disabled={statusUpdating || activeGenerated?.status === "SELECTED"}
                  className="btn-primary text-sm"
                >
                  {activeGenerated?.status === "SELECTED" ? "대표안 저장됨" : "프로젝트 대표안으로 저장"}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("SHORTLISTED")}
                  disabled={statusUpdating}
                  className="btn-secondary text-sm"
                >
                  Shortlist 저장
                </button>
                {activeGenerated ? (
                  <Link href={`/ideas/${activeGenerated.id}`} className="btn-secondary text-sm">
                    아이디어 워크스페이스
                  </Link>
                ) : null}
                {projectId && blueprintCaseId ? (
                  <Link
                    href={`/blueprint?projectId=${encodeURIComponent(projectId)}&caseId=${encodeURIComponent(blueprintCaseId)}`}
                    className="btn-ghost text-sm"
                  >
                    Blueprint 만들기
                  </Link>
                ) : null}
              </div>
            </div>
          </Surface>
        ) : null}
      </div>
    </AuthGuard>
  );
}
