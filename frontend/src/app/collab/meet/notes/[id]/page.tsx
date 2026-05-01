"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";

type Summary = {
  keyPoints?: string[];
  decisions?: string[];
  actions?: Array<{ owner?: string; content?: string }>;
  nextSteps?: string[];
};

type Note = {
  id: string;
  title: string;
  source: "UPLOAD" | "LIVE_BROWSER" | "BOT";
  durationSec: number | null;
  transcriptText: string;
  summary: Summary | null;
  ideaId: string | null;
  roomCode: string | null;
  createdAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  UPLOAD: "📁 업로드",
  LIVE_BROWSER: "🎤 실시간 자막",
  BOT: "🤖 봇",
};

type Stage = { id: string; name: string; stageNumber: number };

export default function MeetingNoteDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { token } = useAuth();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState("");

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    api<{ note: Note }>("GET", `/api/meetings/${id}`, undefined, token)
      .then((res) => {
        if (cancelled) return;
        setNote(res.note);
        // 연결된 워크스페이스 stage 가져오기
        if (res.note.ideaId) {
          api<{ stages: Stage[] }>("GET", `/api/workspace/${res.note.ideaId}`, undefined, token)
            .then((ws) => {
              if (cancelled) return;
              setStages(ws.stages ?? []);
              const active = ws.stages?.find((s) => (s as Stage & { status?: string }).status === "ACTIVE");
              setSelectedStageId(active?.id ?? ws.stages?.[0]?.id ?? "");
            })
            .catch(() => { /* 워크스페이스 없을 수 있음 */ });
        }
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, token]);

  async function convertActionsToTasks() {
    if (!token || !id || !selectedStageId) return;
    setConverting(true);
    setConvertResult("");
    try {
      const res = await api<{ created: number }>(
        "POST",
        `/api/meetings/${id}/to-tasks`,
        { stageId: selectedStageId },
        token,
      );
      setConvertResult(`${res.created}개 작업이 워크스페이스에 추가됐습니다.`);
    } catch (caught) {
      setConvertResult(readError(caught, "변환 실패"));
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete() {
    if (!token || !id) return;
    if (!confirm("이 회의록을 삭제할까요?")) return;
    try {
      await api("DELETE", `/api/meetings/${id}`, undefined, token);
      router.push("/collab/meet/notes");
    } catch (caught) {
      setError(readError(caught, "삭제 실패"));
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingState label="불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !note) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <p className="text-sm text-rose-300">{error || "찾을 수 없습니다."}</p>
          <Link href="/collab/meet/notes" className="btn-primary">목록으로</Link>
        </div>
      </AuthGuard>
    );
  }

  const s = note.summary;

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 fade-up pb-12">
        <header className="space-y-3">
          <Link href="/collab/meet/notes" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 회의록 목록
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                {note.title}
              </h1>
              <p className="text-xs text-zinc-500">
                {SOURCE_LABEL[note.source]}
                {note.durationSec ? ` · ${Math.floor(note.durationSec / 60)}분 ${note.durationSec % 60}초` : ""}
                {" · "}{note.transcriptText.length}자
                {" · "}{formatRelativeTime(note.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              삭제
            </button>
          </div>
        </header>

        {/* 요약 */}
        {s ? (
          <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              요약
            </p>
            {Array.isArray(s.keyPoints) && s.keyPoints.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-zinc-300">핵심</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-7 text-zinc-100">
                  {s.keyPoints.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {Array.isArray(s.decisions) && s.decisions.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-zinc-300">결정 사항</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-7 text-zinc-100">
                  {s.decisions.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {Array.isArray(s.actions) && s.actions.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-zinc-300">액션 아이템</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-7 text-zinc-100">
                  {s.actions.map((a, i) => (
                    <li key={i}>
                      {a.owner ? <span className="font-semibold text-zinc-100">{a.owner}</span> : null}
                      {a.owner ? ": " : ""}
                      {a.content}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {Array.isArray(s.nextSteps) && s.nextSteps.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-zinc-300">다음 단계</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-7 text-zinc-100">
                  {s.nextSteps.map((n, i) => (
                    <li key={i}>• {n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
            요약이 생성되지 않았습니다. 원본 transcript는 아래에서 볼 수 있습니다.
          </p>
        )}

        {/* 원본 transcript */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="flex w-full items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-200"
          >
            <span>📜 원본 Transcript</span>
            <span>{showFull ? "접기 ▴" : "펼치기 ▾"}</span>
          </button>
          {showFull ? (
            <pre className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200">
              {note.transcriptText}
            </pre>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              {note.transcriptText.slice(0, 200)}…
            </p>
          )}
        </section>

        {note.ideaId && Array.isArray(s?.actions) && s.actions.length > 0 && stages.length > 0 ? (
          <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <div>
              <p className="eyebrow">액션 아이템 → 워크스페이스</p>
              <p className="mt-1 text-sm text-zinc-300">
                위 액션 아이템 <span className="font-semibold text-white">{s.actions.length}건</span>을 워크스페이스 task로 자동 추가할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select max-w-[240px]"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
              >
                {stages.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    0{stg.stageNumber} {stg.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={convertActionsToTasks}
                disabled={converting || !selectedStageId}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-60"
              >
                {converting ? "변환 중..." : "task로 추가"}
              </button>
            </div>
            {convertResult ? (
              <p className="text-sm text-zinc-300">{convertResult}</p>
            ) : null}
          </section>
        ) : null}

        {note.ideaId ? (
          <Link
            href={`/workspace/${note.ideaId}`}
            className="block rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm font-semibold text-zinc-200 hover:border-white/20 hover:bg-white/[0.04]"
          >
            이 회의가 연결된 워크스페이스로 이동 →
          </Link>
        ) : null}
      </div>
    </AuthGuard>
  );
}
