"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCreditErrorDetails, readError, targetMarketOptions } from "@/lib/product";
import {
  type DiscoveryCase,
  type DiscoveryResponse,
  type DiscoveryUnlockResponse,
  DISCOVERY_CREDIT_COST,
  UNLOCK_CREDIT_COST,
} from "@/lib/types";

function CaseCard({
  item,
  projectId,
  token,
  onUnlock,
  isUnlocking,
}: {
  item: DiscoveryCase;
  projectId: string;
  token: string | null;
  onUnlock: (caseId: string) => Promise<void>;
  isUnlocking: boolean;
}) {
  const isLocked = item.locked && item.rank !== 1;

  if (isLocked) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
      >
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-sm"
          style={{ background: "rgba(7,6,15,0.82)" }}
        >
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>잠긴 케이스</p>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              {UNLOCK_CREDIT_COST}크레딧을 사용해 전체 분석을 확인하세요
            </p>
          </div>
          {item.caseId ? (
            <button
              onClick={() => onUnlock(item.caseId!)}
              disabled={isUnlocking}
              className="btn-primary px-5 py-2 text-sm"
            >
              {isUnlocking ? "잠금 해제 중..." : `잠금 해제 (${UNLOCK_CREDIT_COST} 크레딧)`}
            </button>
          ) : (
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>케이스 ID 없음</span>
          )}
        </div>

        <div className="blur-sm select-none pointer-events-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em]" style={{ color: "var(--ink)" }}>
                {item.rank}. {item.companyName || "???"}
              </p>
              <p className="mt-2 text-sm leading-7" style={{ color: "var(--ink-3)" }}>
                {item.industry || "업종 미상"} · {item.targetMarket}
              </p>
            </div>
            <span className="badge badge-neutral">
              similarity {(item.similarityScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["설립연도", "투자단계", "상세분석"].map((label) => (
              <div
                key={label}
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--ink-4)",
                }}
              >
                {label}: ─────
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold tracking-[-0.03em]" style={{ color: "var(--ink)" }}>
              {item.rank}. {item.companyName}
            </p>
            {item.rank === 1 && (
              <span className="badge badge-accent text-xs">Best Match</span>
            )}
          </div>
          {item.shortDescription && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>{item.shortDescription}</p>
          )}
          <p className="mt-1 text-sm leading-7" style={{ color: "var(--ink-3)" }}>
            {item.industry || "업종 미상"} · {item.targetMarket} · {item.revenueModel ?? item.businessModel ?? "-"}
          </p>
        </div>
        <span className="badge badge-neutral shrink-0">
          {(item.similarityScore * 100).toFixed(1)}% match
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { label: "설립", value: item.foundedYear || "-" },
          { label: "투자", value: item.fundingStage || "-" },
          { label: "출처", value: item.geographicOrigin || "-" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--ink-3)",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>{stat.label}: </span>{stat.value}
          </div>
        ))}
      </div>

      {typeof item.analysis?.problemStatement === "string" && item.analysis.problemStatement && (
        <div
          className="mt-4 rounded-xl px-4 py-3"
          style={{
            background: "rgba(79,110,247,0.07)",
            border: "1px solid rgba(79,110,247,0.18)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--accent)" }}
          >
            핵심 문제
          </p>
          <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--ink-2)" }}>
            {item.analysis.problemStatement}
          </p>
        </div>
      )}

      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(item.tags as string[]).map((tag) => (
            <span key={tag} className="badge badge-neutral text-xs">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.caseId ? (
          <Link
            href={`/blueprint?caseId=${item.caseId}&companyName=${encodeURIComponent(item.companyName)}${projectId ? `&projectId=${projectId}` : ""}`}
            className="btn-secondary px-4 py-2 text-sm"
          >
            이 사례로 Blueprint 만들기
          </Link>
        ) : (
          <span className="badge badge-warning">Blueprint 연결 불가 (case id 없음)</span>
        )}
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  const searchParams = useSearchParams();
  const { token, user, updateCredit } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [targetMarket, setTargetMarket] = useState(searchParams.get("market") || "B2C");
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [creditError, setCreditError] = useState<ReturnType<typeof getCreditErrorDetails>>(null);
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [unlockedCases, setUnlockedCases] = useState<Record<string, DiscoveryUnlockResponse>>({});
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState("");

  const currentCreditBalance = user?.creditBalance ?? null;
  const hasEnoughCredits =
    currentCreditBalance === null || currentCreditBalance >= DISCOVERY_CREDIT_COST;
  const activeCreditError =
    creditError ??
    (currentCreditBalance !== null && currentCreditBalance < DISCOVERY_CREDIT_COST
      ? { required: DISCOVERY_CREDIT_COST, creditBalance: currentCreditBalance }
      : null);

  useEffect(() => {
    const seedKeyword = searchParams.get("keyword");
    if (seedKeyword) setKeyword(seedKeyword);
  }, [searchParams]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (!hasEnoughCredits) {
      setCreditError(
        currentCreditBalance === null
          ? { required: DISCOVERY_CREDIT_COST, creditBalance: null }
          : { required: DISCOVERY_CREDIT_COST, creditBalance: currentCreditBalance },
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setCreditError(null);
    setUnlockedCases({});
    setUnlockError("");

    try {
      const response = await api<DiscoveryResponse>(
        "POST",
        "/api/discovery",
        { keyword, targetMarket },
        token,
      );
      setResult(response);
      updateCredit(response.credit.balance);
      localStorage.setItem("widea_recent_discovery", JSON.stringify(response.results.slice(0, 6)));
    } catch (caught) {
      setCreditError(getCreditErrorDetails(caught));
      setError(readError(caught, "Discovery 실행에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlock(caseId: string) {
    if (!token) return;
    setUnlockingId(caseId);
    setUnlockError("");

    try {
      const response = await api<DiscoveryUnlockResponse>(
        "POST",
        "/api/discovery/unlock",
        { caseId },
        token,
      );
      setUnlockedCases((prev) => ({ ...prev, [caseId]: response }));
      updateCredit(response.credit.balance);
    } catch (caught) {
      const errDetails = getCreditErrorDetails(caught);
      if (errDetails) {
        setUnlockError(
          `잠금 해제에 크레딧이 부족합니다. 필요: ${errDetails.required} 크레딧, 현재 잔액: ${errDetails.creditBalance ?? "-"}`
        );
      } else {
        setUnlockError(readError(caught, "잠금 해제에 실패했습니다."));
      }
    } finally {
      setUnlockingId(null);
    }
  }

  function mergeWithUnlocked(item: DiscoveryCase): DiscoveryCase {
    if (!item.caseId || !unlockedCases[item.caseId]) return item;
    const unlocked = unlockedCases[item.caseId];
    return { ...item, ...unlocked, rank: item.rank, similarityScore: item.similarityScore, locked: false };
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="글로벌 케이스 탐색"
          title="Discovery"
          description="키워드와 타깃 시장을 입력하면 유사한 글로벌 성공 사례 3개를 찾아드립니다. 첫 번째 결과는 무료, 나머지 2개는 크레딧으로 잠금 해제할 수 있습니다."
        />

        <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          {/* 검색 폼 */}
          <Surface className="space-y-5">
            <div>
              <p className="eyebrow">검색 입력</p>
              <h2
                className="text-2xl font-semibold tracking-[-0.04em]"
                style={{ color: "var(--ink)" }}
              >
                어떤 시장을 탐색할까요?
              </h2>
            </div>

            {activeCreditError ? (
              <div
                role="alert"
                className="space-y-3 rounded-xl px-4 py-4 text-sm"
                style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  color: "#FCD34D",
                }}
              >
                <div className="space-y-1">
                  <p className="font-semibold">크레딧이 부족합니다</p>
                  <p style={{ color: "var(--ink-3)" }}>
                    Discovery는 1회 실행에 {activeCreditError.required} 크레딧이 필요합니다.
                    {activeCreditError.creditBalance !== null
                      ? ` 현재 잔액: ${activeCreditError.creditBalance} 크레딧`
                      : ""}
                  </p>
                </div>
                <Link href="/pricing" className="btn-secondary inline-flex">
                  크레딧 충전하러 가기
                </Link>
              </div>
            ) : null}

            {error && !activeCreditError ? (
              <div
                role="alert"
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "#FCA5A5",
                }}
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSearch} className="grid gap-4">
              <div>
                <label htmlFor="keyword" className="field-label">탐색 키워드</label>
                <textarea
                  id="keyword"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  className="textarea"
                  placeholder="예: AI로 리서치를 자동화하는 B2B SaaS, 인사팀이 바로 도입 가능한 제품"
                  required
                />
              </div>

              <div>
                <label htmlFor="market" className="field-label">타깃 마켓</label>
                <select
                  id="market"
                  value={targetMarket}
                  onChange={(event) => setTargetMarket(event.target.value)}
                  className="select"
                >
                  {targetMarketOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="projectId" className="field-label">연결 프로젝트 ID</label>
                <input
                  id="projectId"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="input"
                  placeholder="선택 사항: Blueprint에 바로 연결"
                />
              </div>

              <div
                className="rounded-xl px-4 py-4"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>크레딧</p>
                    <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                      검색 {DISCOVERY_CREDIT_COST}크레딧 · 잠금 해제 {UNLOCK_CREDIT_COST}크레딧/개
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>잔액</p>
                    <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                      {user?.isAdmin ? "Unlimited" : `${currentCreditBalance ?? "-"} credits`}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !hasEnoughCredits}
                className="btn-primary w-full"
              >
                {submitting
                  ? "Discovery 실행 중..."
                  : hasEnoughCredits
                    ? "유사 케이스 3개 찾기"
                    : "크레딧 충전 후 이용 가능"}
              </button>
            </form>
          </Surface>

          {/* 결과 영역 */}
          <Surface className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">검색 결과</p>
                <h2
                  className="text-2xl font-semibold tracking-[-0.04em]"
                  style={{ color: "var(--ink)" }}
                >
                  발견된 글로벌 사례
                </h2>
              </div>
              {result ? (
                <span className="badge badge-accent">
                  {result.matchCount}개 · credit {result.credit.used}
                </span>
              ) : null}
            </div>

            {!result ? (
              <EmptyState
                title="검색을 시작해 보세요"
                description="키워드를 입력하면 유사한 글로벌 사례 3개가 나타납니다. 1개는 무료로 공개되고, 나머지 2개는 잠금 해제 후 볼 수 있습니다."
              />
            ) : result.results.length === 0 ? (
              <EmptyState
                title="매칭되는 사례가 없습니다"
                description="키워드를 조금 더 넓게 잡거나 타깃 마켓을 바꿔 다시 시도해 보세요."
              />
            ) : (
              <>
                {unlockError && (
                  <div
                    role="alert"
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: "rgba(251,191,36,0.08)",
                      border: "1px solid rgba(251,191,36,0.2)",
                      color: "#FCD34D",
                    }}
                  >
                    {unlockError}
                    <Link href="/pricing" className="ml-2 underline" style={{ color: "var(--accent)" }}>
                      크레딧 충전
                    </Link>
                  </div>
                )}

                <div className="grid gap-3">
                  {result.results.map((item) => {
                    const merged = mergeWithUnlocked(item);
                    return (
                      <CaseCard
                        key={`${item.companyName}-${item.rank}`}
                        item={merged}
                        projectId={projectId}
                        token={token}
                        onUnlock={handleUnlock}
                        isUnlocking={unlockingId === item.caseId}
                      />
                    );
                  })}
                </div>

                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.025)",
                    color: "var(--ink-3)",
                  }}
                >
                  <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>DB 전체:</span>{" "}
                  {result.totalCasesInDB.toLocaleString()}개 케이스
                  &nbsp;·&nbsp;
                  <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>검색어:</span>{" "}
                  {result.keyword}
                </div>
              </>
            )}
          </Surface>
        </div>
      </div>
    </AuthGuard>
  );
}
