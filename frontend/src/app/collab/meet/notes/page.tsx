"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";

type NoteSummary = {
  id: string;
  title: string;
  source: "UPLOAD" | "LIVE_BROWSER" | "BOT";
  durationSec: number | null;
  ideaId: string | null;
  roomCode: string | null;
  summary: { keyPoints?: string[] } | null;
  createdAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  UPLOAD: "📁 업로드",
  LIVE_BROWSER: "🎤 실시간",
  BOT: "🤖 봇",
};

export default function MeetingNotesListPage() {
  const { token } = useAuth();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ notes: NoteSummary[] }>("GET", "/api/meetings", undefined, token)
      .then((res) => { if (!cancelled) setNotes(res.notes); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "회의록을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/collab/meet" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 실시간 회의
          </Link>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">내 회의록</h1>
          <p className="text-sm text-zinc-400">
            업로드한 녹음 + 실시간 자막에서 만들어진 회의록 모음
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingState label="불러오는 중..." />
        ) : notes.length === 0 ? (
          <EmptyState
            title="아직 회의록이 없습니다"
            description="회의방에서 녹음 파일을 업로드하거나 실시간 자막을 켜면 자동으로 모입니다."
            action={
              <Link href="/collab/meet" className="btn-primary text-sm">
                회의 시작 →
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/collab/meet/notes/${n.id}`}
                  className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="truncate text-base font-bold text-white group-hover:text-violet-100">
                      {n.title}
                    </p>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[0.65rem] font-bold text-zinc-300">
                      {SOURCE_LABEL[n.source]}
                    </span>
                  </div>
                  {n.summary?.keyPoints && n.summary.keyPoints.length > 0 ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                      {n.summary.keyPoints.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>{formatRelativeTime(n.createdAt)}</span>
                    {n.durationSec ? (
                      <span>· {Math.floor(n.durationSec / 60)}분 {n.durationSec % 60}초</span>
                    ) : null}
                    {n.roomCode ? <span>· 회의방 {n.roomCode}</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AuthGuard>
  );
}
