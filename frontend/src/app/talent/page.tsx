"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { api, buildQuery } from "@/lib/api";
import { readError } from "@/lib/product";

type ExpertCategory =
  | "DEVELOPER"
  | "DESIGNER"
  | "MARKETER"
  | "AC_MENTOR"
  | "PLANNER"
  | "PM"
  | "OTHER";

type Expert = {
  id: string;
  userId: string;
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string | null;
  available: boolean;
  user: { id: string; name: string | null; email: string } | null;
};

const CATEGORY_LABEL: Record<ExpertCategory, string> = {
  DEVELOPER: "개발자",
  DESIGNER: "디자이너",
  MARKETER: "마케터",
  AC_MENTOR: "AC·멘토",
  PLANNER: "기획자",
  PM: "PM",
  OTHER: "기타",
};

const CATEGORY_COLOR: Record<ExpertCategory, string> = {
  DEVELOPER: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/30",
  DESIGNER: "text-violet-300 bg-violet-500/10 ring-violet-400/30",
  MARKETER: "text-amber-300 bg-amber-500/10 ring-amber-400/30",
  AC_MENTOR: "text-indigo-300 bg-indigo-500/10 ring-indigo-400/30",
  PLANNER: "text-rose-300 bg-rose-500/10 ring-rose-400/30",
  PM: "text-sky-300 bg-sky-500/10 ring-sky-400/30",
  OTHER: "text-zinc-400 bg-white/[0.04] ring-white/10",
};

const CATEGORIES: Array<{ value: "" | ExpertCategory; label: string }> = [
  { value: "", label: "전체" },
  { value: "DEVELOPER", label: "개발자" },
  { value: "DESIGNER", label: "디자이너" },
  { value: "PLANNER", label: "기획자" },
  { value: "PM", label: "PM" },
  { value: "MARKETER", label: "마케터" },
  { value: "AC_MENTOR", label: "AC·멘토" },
];

function formatRate(min: number | null, max: number | null) {
  if (min == null && max == null) return "협의";
  const fmt = (n: number) => `${(n / 10000).toLocaleString()}만`;
  if (min != null && max != null) return `${fmt(min)} ~ ${fmt(max)}원/시간`;
  if (min != null) return `${fmt(min)}원~/시간`;
  return `~${fmt(max!)}원/시간`;
}

export default function TalentPage() {
  const [category, setCategory] = useState<"" | ExpertCategory>("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ experts: Expert[] }>(
      "GET",
      buildQuery("/api/experts", { category, q, limit: 50 }),
    )
      .then((res) => {
        if (!cancelled) setExperts(res.experts);
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "전문가 목록 불러오기 실패"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, q]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput.trim());
  }

  const totalLabel = useMemo(() => {
    if (loading) return "불러오는 중";
    return `${experts.length}명`;
  }, [loading, experts.length]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-8 fade-up pb-12">
        {/* 헤더 */}
        <header className="space-y-3">
          <p className="eyebrow">전문가 디렉토리</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="editorial-h1">전문가 찾기</h1>
              <p className="mt-1 text-sm text-zinc-400">
                개발자·디자이너·기획자·AC 멘토 등 등록된 전문가를 직접 컨택하세요.
              </p>
            </div>
            <Link
              href="/mypage/expert"
              className="rounded-md border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
            >
              ⚙ 내 프로필 등록·수정
            </Link>
          </div>
        </header>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            placeholder="이름·소개·스킬 검색 (예: React, 핀테크)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input flex-1"
          />
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            검색
          </button>
          {q ? (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setQ(""); }}
              className="btn-ghost px-3 py-2 text-sm"
            >
              초기화
            </button>
          ) : null}
        </form>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === c.value
                  ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/40"
                  : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
              }`}
            >
              {c.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-500">총 {totalLabel}</span>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingState label="전문가 불러오는 중..." />
        ) : experts.length === 0 ? (
          <EmptyState
            title="등록된 전문가가 아직 없습니다"
            description="첫 번째 전문가가 되어보세요."
            action={
              <Link href="/mypage/expert" className="btn-primary text-sm">
                내 프로필 등록 →
              </Link>
            }
          />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((e) => (
              <Link
                key={e.id}
                href={`/u/${e.userId}`}
                className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-violet-400/40 hover:bg-white/[0.04]"
              >
                {/* 헤더: 이름 + 카테고리 배지 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">
                      {e.user?.name || "익명 전문가"}
                    </p>
                    {e.location ? (
                      <p className="text-[0.7rem] text-zinc-500">{e.location}</p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ${CATEGORY_COLOR[e.category]}`}
                  >
                    {CATEGORY_LABEL[e.category]}
                  </span>
                </div>

                {/* Headline */}
                <p className="line-clamp-2 text-sm font-semibold text-zinc-100">
                  {e.headline}
                </p>

                {/* Skills (상위 4개) */}
                {e.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {e.skills.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[0.65rem] text-zinc-300"
                      >
                        {s}
                      </span>
                    ))}
                    {e.skills.length > 4 ? (
                      <span className="text-[0.65rem] text-zinc-500">
                        +{e.skills.length - 4}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* 시급 + CTA */}
                <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs font-semibold text-emerald-300">
                    {formatRate(e.hourlyRateMin, e.hourlyRateMax)}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 group-hover:text-violet-300">
                    프로필 보기 →
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </AuthGuard>
  );
}
