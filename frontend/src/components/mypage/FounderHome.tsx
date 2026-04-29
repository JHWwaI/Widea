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

export default function FounderHome() {
  const { token } = useAuth();
  const router = useRouter();
  const [myIdeas, setMyIdeas] = useState<MyIdea[]>([]);
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
      .then((sessionData) => {
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

      {/* 내 아이디어 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            내 아이디어 <span className="text-zinc-500">({myIdeas.length})</span>
          </h2>
          <Link href="/projects" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
            프로젝트로 보기 →
          </Link>
        </div>

        {loading ? (
          <LoadingState label="아이디어를 불러오는 중..." />
        ) : myIdeas.length === 0 ? (
          <EmptyState
            title="선정한 아이디어가 없습니다"
            description="아이디어 매칭에서 마음에 드는 아이디어를 골라보세요."
            action={
              <Link href="/idea-match" className="btn-primary text-sm">아이디어 탐색하기</Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {myIdeas.map((idea) => (
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
                className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-indigo-400/40 hover:bg-white/[0.05]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-white">
                      {idea.titleKo}
                    </p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold ${
                        idea.status === "SELECTED"
                          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
                          : "bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20"
                      }`}
                    >
                      {idea.status === "SELECTED" ? "대표" : "Shortlist"}
                    </span>
                    {idea.marketFitScore != null ? (
                      <span className="text-xs text-zinc-400">
                        적합도 {idea.marketFitScore}
                      </span>
                    ) : null}
                  </div>
                  {idea.oneLinerKo ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{idea.oneLinerKo}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {idea.sessionProjectTitle ? (
                      <span>프로젝트: {idea.sessionProjectTitle}</span>
                    ) : null}
                    {idea.updatedAt ? <span>· {formatRelativeTime(idea.updatedAt)}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/workspace/${idea.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                  >
                    워크스페이스 →
                  </Link>
                  <span className="text-zinc-500 group-hover:text-indigo-300">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 빠른 이동 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">빠른 이동</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/community" title="커뮤니티" desc="아이디어 공유 · 질문 · 인사이트" />
          <QuickLink href="/collab" title="외주·팀원 모집" desc="개발자·디자이너 매칭, 외주 의뢰" />
          <QuickLink href="/collab/meet" title="실시간 회의" desc="팀과 화상 미팅, 화면 공유" />
          <QuickLink href="/projects" title="내 프로젝트" desc="프로젝트 단위 관리" />
          <QuickLink href="/mypage/edit" title="프로필 편집" desc="이름·비밀번호·역할 변경" />
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
      className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-indigo-400/40 hover:bg-white/[0.05]"
    >
      <p className="text-sm font-semibold text-white group-hover:text-indigo-200">{title}</p>
      <p className="mt-1 text-xs text-zinc-400">{desc}</p>
      <p className="mt-3 text-xs font-semibold text-indigo-300">바로가기 →</p>
    </Link>
  );
}
