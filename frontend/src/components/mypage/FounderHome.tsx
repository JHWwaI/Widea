"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";
import type { IdeaMatchSessionListResponse } from "@/lib/types";

interface MyIdea {
  id: string;
  titleKo: string;
  oneLinerKo?: string | null;
  status: string;
  marketFitScore?: number | null;
  sessionProjectTitle?: string;
  updatedAt?: string;
}

interface WorkspaceSummary {
  ideaId: string;
  total: number;
  done: number;
  pct: number;
  stageCount: number;
  nextTask: string | null;
  nextStageName: string | null;
  nextStageNumber: number | null;
}

export default function FounderHome() {
  const { token } = useAuth();
  const router = useRouter();
  const [myIdeas, setMyIdeas] = useState<MyIdea[]>([]);
  const [summaries, setSummaries] = useState<Record<string, WorkspaceSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    api<IdeaMatchSessionListResponse>(
      "GET",
      buildQuery("/api/idea-match/sessions", { limit: 20 }),
      undefined,
      token,
    )
      .then(async (sessionData) => {
        if (cancelled) return;
        const ideas: MyIdea[] = [];
        for (const session of sessionData.sessions) {
          if (session.generatedIdeas) {
            for (const idea of session.generatedIdeas) {
              if (idea.status === "SELECTED" || idea.status === "SHORTLISTED") {
                ideas.push({
                  id: idea.id,
                  titleKo: idea.titleKo,
                  oneLinerKo: idea.oneLinerKo,
                  status: idea.status,
                  marketFitScore: idea.marketFitScore,
                  sessionProjectTitle: session.projectPolicy?.title,
                  updatedAt: idea.updatedAt,
                });
              }
            }
          }
        }
        setMyIdeas(ideas);

        // 워크스페이스 요약 fetch (SELECTED만 워크스페이스 있음)
        const selectedIds = ideas
          .filter((i) => i.status === "SELECTED")
          .map((i) => i.id);
        if (selectedIds.length > 0) {
          try {
            const res = await api<{ summaries: WorkspaceSummary[] }>(
              "GET",
              buildQuery("/api/workspace/summaries", { ideaIds: selectedIds.join(",") }),
              undefined,
              token,
            );
            if (cancelled) return;
            const map: Record<string, WorkspaceSummary> = {};
            for (const s of res.summaries) map[s.ideaId] = s;
            setSummaries(map);
          } catch {
            // 워크스페이스 없으면 무시
          }
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "데이터를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  return (
    <>
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* 내 프로젝트 — 카드 보드 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            내 프로젝트 <span className="text-zinc-500">({myIdeas.length})</span>
          </h2>
          <Link href="/idea-match" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
            새 아이디어 만들기 →
          </Link>
        </div>

        {loading ? (
          <LoadingState label="프로젝트를 불러오는 중..." />
        ) : myIdeas.length === 0 ? (
          <EmptyState
            title="아직 선정한 프로젝트가 없습니다"
            description="아이디어 매칭에서 마음에 드는 아이디어를 골라보세요."
            action={
              <Link href="/idea-match" className="btn-primary text-sm">아이디어 탐색하기</Link>
            }
          />
        ) : (
          <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-2">
            {myIdeas.map((idea) => {
              const summary = summaries[idea.id];
              const isSelected = idea.status === "SELECTED";
              return (
                <div
                  key={idea.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/ideas/${idea.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/ideas/${idea.id}`);
                    }
                  }}
                  className="group flex cursor-pointer flex-col gap-3 bg-zinc-950 p-6 transition-colors hover:bg-white/[0.025]"
                >
                  {/* 제목 + 상태 */}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-base font-semibold text-white">{idea.titleKo}</p>
                    <span
                      className={`shrink-0 text-[0.65rem] font-medium uppercase tracking-wider ${
                        isSelected ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {isSelected ? "대표" : "Shortlist"}
                    </span>
                  </div>

                  {/* 한 줄 설명 */}
                  {idea.oneLinerKo ? (
                    <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{idea.oneLinerKo}</p>
                  ) : null}

                  {/* 진척 바 (SELECTED만) */}
                  {isSelected && summary ? (
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-zinc-500">진척</span>
                        <span className="font-semibold tabular-nums text-white">
                          {summary.pct}%{" "}
                          <span className="font-normal text-zinc-500">· {summary.done}/{summary.total}</span>
                        </span>
                      </div>
                      <div className="h-px overflow-hidden bg-white/[0.06]">
                        <div
                          className="h-full bg-white transition-all"
                          style={{ width: `${summary.pct}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* 다음 할 일 */}
                  {isSelected && summary?.nextTask ? (
                    <div className="border-l border-white/15 pl-3">
                      <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
                        다음 할 일 · 0{summary.nextStageNumber} {summary.nextStageName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-100">
                        {summary.nextTask}
                      </p>
                    </div>
                  ) : null}

                  {/* 푸터 — 워크스페이스 진입 */}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    {idea.updatedAt ? (
                      <span className="text-[0.65rem] text-zinc-500">
                        {formatRelativeTime(idea.updatedAt)}
                      </span>
                    ) : <span />}
                    {isSelected ? (
                      <Link
                        href={`/workspace/${idea.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        워크스페이스 →
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-500 group-hover:text-zinc-300">분석 보기 →</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 빠른 이동 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">빠른 이동</h2>
        <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/community" title="커뮤니티" desc="아이디어 공유 · 질문 · 인사이트" />
          <QuickLink href="/talent" title="전문가 찾기" desc="개발자·디자이너·AC 멘토 매칭" />
          <QuickLink href="/projects" title="내 프로젝트" desc="프로젝트 단위 관리" />
          <QuickLink href="/mypage/edit" title="프로필 편집" desc="이름·비밀번호·역할 변경" />
          <QuickLink href="/mypage/expert" title="전문가 등록" desc="내 프로필을 전문가 디렉토리에 노출" />
          <QuickLink href="/contact" title="문의하기" desc="버그 신고·문의·피드백" />
        </div>
      </section>
    </>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group bg-zinc-950 p-5 transition-colors hover:bg-white/[0.025]"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-400">{desc}</p>
      <p className="mt-3 text-xs font-medium text-zinc-300 group-hover:text-white">바로가기 →</p>
    </Link>
  );
}
