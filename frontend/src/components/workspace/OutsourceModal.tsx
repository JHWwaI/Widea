"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { readError } from "@/lib/product";
import { LoadingState } from "@/components/ProductUI";
import type { WorkspaceTask } from "@/app/workspace/[ideaId]/page";

type Draft = { titleKo: string; bodyKo: string; category: string };

type MatchedExpert = {
  id: string;
  userId: string;
  category: string;
  headline: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  user: { id: string; name: string | null; email: string } | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  TEAM_RECRUIT: "팀원 모집",
  OUTSOURCE_REQUEST: "외주 의뢰",
  AC_REQUEST: "AC·멘토 컨택",
  MENTOR_REQUEST: "멘토 모집",
  BETA_TESTER: "베타 테스터",
};

export default function OutsourceModal({
  task,
  onClose,
  onPosted,
}: {
  task: WorkspaceTask;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [matched, setMatched] = useState<MatchedExpert[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      try {
        const res = await api<{ draft: Draft }>(
          "POST",
          `/api/workspace/tasks/${task.id}/outsource`,
          { mode: "preview" },
          token,
        );
        if (cancelled) return;
        setDraft(res.draft);
      } catch (caught) {
        if (cancelled) return;
        setError(readError(caught, "초안 생성 실패."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // 추천 전문가 fetch (병렬)
    (async () => {
      try {
        const res = await api<{ experts: MatchedExpert[] }>(
          "GET",
          buildQuery("/api/experts/match", {
            q: task.content,
            role: task.outsourceRole ?? "",
            limit: 3,
          }),
        );
        if (!cancelled) setMatched(res.experts);
      } catch {
        /* 추천 실패는 무시 */
      }
    })();
    return () => { cancelled = true; };
  }, [task.id, task.content, task.outsourceRole, token]);

  async function publish() {
    if (!token || !draft) return;
    setPosting(true);
    setError("");
    try {
      await api(
        "POST",
        `/api/workspace/tasks/${task.id}/outsource`,
        {
          mode: "publish",
          title: draft.titleKo,
          content: draft.bodyKo,
          category: draft.category,
        },
        token,
      );
      onPosted();
    } catch (caught) {
      setError(readError(caught, "게시 실패."));
      setPosting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div className="fixed inset-x-2 top-8 bottom-8 z-[70] mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                외주·AC 컨설팅·팀 모집 글 자동 작성
              </p>
              <p className="mt-1 text-sm text-zinc-300">{task.content}</p>
              {task.outsourceRole ? (
                <p className="mt-0.5 text-xs text-zinc-500">{task.outsourceRole}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingState label="초안 생성 중... (5~10초)" />
            </div>
          ) : draft ? (
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* 카테고리 선택 */}
              <div>
                <label className="field-label">게시할 카테고리</label>
                <select
                  className="input"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* 제목 */}
              <div>
                <label className="field-label">제목</label>
                <input
                  className="input"
                  value={draft.titleKo}
                  onChange={(e) => setDraft({ ...draft, titleKo: e.target.value })}
                  maxLength={200}
                />
              </div>

              {/* 본문 */}
              <div>
                <label className="field-label">본문 (마크다운 가능)</label>
                <textarea
                  className="input min-h-[280px] resize-y"
                  value={draft.bodyKo}
                  onChange={(e) => setDraft({ ...draft, bodyKo: e.target.value })}
                />
              </div>

              {/* 추천 전문가 — 게시 안 하고 직접 컨택 */}
              {matched.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    이 task에 맞는 전문가 {matched.length}명 · 게시 없이 직접 컨택 가능
                  </p>
                  <div className="space-y-1.5">
                    {matched.map((m) => (
                      <Link
                        key={m.id}
                        href={`/u/${m.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {m.user?.name || "익명"}
                          </p>
                          <p className="truncate text-[0.7rem] text-zinc-400">{m.headline}</p>
                          {m.skills.length > 0 ? (
                            <p className="truncate text-[0.65rem] text-zinc-500">
                              {m.skills.slice(0, 4).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[0.7rem] font-medium text-zinc-300">
                          프로필 →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          ) : (
            <div className="flex-1 p-5">
              <p className="text-sm text-rose-300">{error || "초안이 없습니다."}</p>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 p-4">
            <p className="text-xs text-zinc-500">
              게시하면 이 task는 자동으로 “외주 진행 중”으로 표시됩니다.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
                취소
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={!draft || posting}
                className="btn-primary px-5 py-2 text-sm"
              >
                {posting ? "게시 중..." : "커뮤니티에 게시"}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
