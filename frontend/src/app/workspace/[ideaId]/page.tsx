"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import StageDetail from "@/components/workspace/StageDetail";
import FocusMode from "@/components/workspace/FocusMode";

type TaskStatus = "PENDING" | "DONE" | "SKIPPED" | "OUTSOURCED";
type StageStatus = "PENDING" | "ACTIVE" | "DONE";

export type WorkspaceTask = {
  id: string;
  stageId: string;
  content: string;
  status: TaskStatus;
  outsourceRole: string | null;
  communityPostId: string | null;
  isCustom: boolean;
  orderIndex: number;
};

export type WorkspaceStage = {
  id: string;
  ideaId: string;
  stageNumber: number;
  name: string;
  status: StageStatus;
  tasks: WorkspaceTask[];
};

type WorkspaceResponse = {
  idea: { id: string; titleKo: string; oneLinerKo: string | null; status: string };
  stages: WorkspaceStage[];
};

export default function WorkspacePage() {
  const { ideaId: rawId } = useParams<{ ideaId: string }>();
  const ideaId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { token } = useAuth();
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openStageId, setOpenStageId] = useState<string | null>(null);
  const [view, setView] = useState<"focus" | "grid">("grid");

  async function refresh() {
    if (!token || !ideaId) return;
    try {
      const res = await api<WorkspaceResponse>(
        "GET",
        `/api/workspace/${ideaId}`,
        undefined,
        token,
      );
      setData(res);
    } catch (caught) {
      setError(readError(caught, "워크스페이스를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, token]);

  async function ensureWorkspace() {
    if (!token || !ideaId) return;
    setLoading(true);
    setError("");
    try {
      await api("POST", `/api/workspace/${ideaId}/ensure`, {}, token);
      await refresh();
    } catch (caught) {
      setError(readError(caught, "워크스페이스 생성에 실패했습니다."));
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingState label="워크스페이스 불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !data) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <p className="text-sm text-rose-300">{error || "워크스페이스를 찾을 수 없습니다."}</p>
          <Link href="/mypage" className="btn-primary">내 아이디어로</Link>
        </div>
      </AuthGuard>
    );
  }

  const { idea, stages } = data;
  const openStage = stages.find((s) => s.id === openStageId) ?? null;

  // 단계 셸이 없으면 (대표 선정 안 했을 가능성) 생성 버튼
  if (stages.length === 0) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-2xl space-y-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
            워크스페이스
          </p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {idea.titleKo}
          </h1>
          <p className="text-sm leading-7 text-zinc-400">
            아직 워크스페이스가 만들어지지 않았습니다.<br/>
            대표 아이디어로 선정하거나, 지금 바로 6단계 작업 보드를 생성하세요.
          </p>
          <button type="button" onClick={ensureWorkspace} className="btn-primary px-6 py-3">
            워크스페이스 만들기
          </button>
        </div>
      </AuthGuard>
    );
  }

  // 진척 통계 — 필수 task만 카운트 (orderIndex < 100)
  const isCore = (t: WorkspaceTask) => t.orderIndex < 100;
  const coreTasksAll = stages.flatMap((s) => s.tasks.filter(isCore));
  const total = coreTasksAll.length;
  const done = coreTasksAll.filter(
    (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
  ).length;
  const overallPct = total === 0 ? 0 : Math.round((done / total) * 100);

  // 다음 할 일 task (Hero CTA용) — 필수만, 그 다음 선택
  const sortedStages = [...stages].sort((a, b) => a.stageNumber - b.stageNumber);
  let nextTask: typeof stages[number]["tasks"][number] | null = null;
  let nextStage: typeof stages[number] | null = null;
  for (const stage of sortedStages) {
    const pending = [...stage.tasks]
      .filter(isCore)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .find((t) => t.status === "PENDING");
    if (pending) {
      nextTask = pending;
      nextStage = stage;
      break;
    }
  }
  const allDone = !nextTask;

  // Focus mode: 1 task에 집중 (default)
  if (view === "focus") {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-5xl px-4 pb-12">
          <Link href={`/ideas/${idea.id}`} className="inline-flex items-center gap-1 py-4 text-xs text-zinc-500 hover:text-zinc-300">
            ← 아이디어 상세
          </Link>
          <FocusMode
            ideaTitle={idea.titleKo}
            ideaId={idea.id}
            stages={stages}
            onChanged={refresh}
            onSwitchToGrid={() => setView("grid")}
          />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-10 fade-up py-4 pb-12">
        {/* 헤더 */}
        <header className="space-y-3">
          <Link href={`/ideas/${idea.id}`} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 아이디어 상세
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow">워크스페이스</p>
              <h1 className="editorial-h1">{idea.titleKo}</h1>
              {idea.oneLinerKo ? (
                <p className="text-sm text-zinc-400">{idea.oneLinerKo}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="display-num text-4xl text-emerald-300 sm:text-5xl">{overallPct}%</p>
              <p className="mt-1 text-xs text-zinc-500">전체 진척 ({done}/{total})</p>
            </div>
          </div>
        </header>

        {/* 다음 할 일 Hero — 가장 큰 CTA */}
        {allDone ? (
          <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-6 text-center">
            <p className="text-3xl">🎉</p>
            <h2 className="mt-2 text-xl font-bold text-emerald-200">모든 단계 완료!</h2>
            <p className="mt-1 text-sm text-zinc-400">{total}개 작업을 모두 처리했어요.</p>
            <Link
              href={`/show/${idea.id}`}
              className="mt-4 inline-flex rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300"
            >
              🌐 사업 페이지 공유하기
            </Link>
          </section>
        ) : nextTask && nextStage ? (
          <section className="space-y-4 rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02] p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold text-violet-300">
                지금 할 일 · 0{nextStage.stageNumber} {nextStage.name}
              </p>
              <p className="text-xs text-zinc-500">{done}/{total} 진행</p>
            </div>
            <h2 className="text-balance text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {nextTask.content}
            </h2>
            <button
              type="button"
              onClick={() => setView("focus")}
              className="w-full rounded-xl bg-violet-500 px-6 py-4 text-base font-bold text-white shadow-[0_8px_32px_-8px_rgba(124,58,237,0.5)] transition-all hover:bg-violet-400 hover:shadow-[0_12px_40px_-8px_rgba(124,58,237,0.6)] sm:w-auto"
            >
              이 작업 시작하기 →
            </button>
          </section>
        ) : null}

        {/* 3-허브: 외주·AC 컨설팅·팀 모집 — 도움받기 진입 */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-white">도움이 필요하면</h2>
            <span className="text-xs text-zinc-500">커뮤니티에 게시 → 응답 받기</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`/community/new?category=OUTSOURCE_REQUEST&title=${encodeURIComponent(`[${idea.titleKo}] 외주 의뢰`)}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-amber-400/40 hover:bg-amber-500/[0.05]"
            >
              <p className="text-2xl">🛠</p>
              <h3 className="mt-2 text-sm font-bold text-white group-hover:text-amber-200">외주 의뢰</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                디자이너·개발자·마케터에게 작업 요청
              </p>
              <p className="mt-3 text-xs font-semibold text-amber-300">글 작성하기 →</p>
            </Link>

            <Link
              href={`/community/new?category=AC_REQUEST&title=${encodeURIComponent(`[${idea.titleKo}] AC·멘토 컨설팅 요청`)}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-violet-400/40 hover:bg-violet-500/[0.05]"
            >
              <p className="text-2xl">🎓</p>
              <h3 className="mt-2 text-sm font-bold text-white group-hover:text-violet-200">AC 컨설팅</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                엑셀러레이터·멘토 매칭으로 검증
              </p>
              <p className="mt-3 text-xs font-semibold text-violet-300">글 작성하기 →</p>
            </Link>

            <Link
              href={`/community/new?category=TEAM_RECRUIT&title=${encodeURIComponent(`[${idea.titleKo}] 팀원 모집`)}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/[0.05]"
            >
              <p className="text-2xl">🤝</p>
              <h3 className="mt-2 text-sm font-bold text-white group-hover:text-emerald-200">팀원 모집</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                공동창업자·개발자·기획자 영입
              </p>
              <p className="mt-3 text-xs font-semibold text-emerald-300">글 작성하기 →</p>
            </Link>
          </div>
        </section>

        {/* 6단계 카드 그리드 */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((s) => {
            const stageTotal = s.tasks.length;
            const stageDone = s.tasks.filter(
              (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
            ).length;
            const stagePct = stageTotal === 0 ? 0 : Math.round((stageDone / stageTotal) * 100);
            const statusBadge =
              s.status === "DONE"
                ? { label: "완료", color: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-400/30" }
                : s.status === "ACTIVE"
                  ? { label: "진행 중", color: "text-violet-300", bg: "bg-violet-500/10", ring: "ring-violet-400/30" }
                  : { label: "대기", color: "text-zinc-500", bg: "bg-white/[0.03]", ring: "ring-white/10" };

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenStageId(s.id)}
                className={`group relative overflow-hidden rounded-2xl border bg-white/[0.02] p-5 text-left transition-all hover:bg-white/[0.05] ${
                  s.status === "ACTIVE" ? "border-violet-400/40" : "border-white/10"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black tabular-nums text-white/[0.15]">
                    0{s.stageNumber}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ring-1 ${statusBadge.bg} ${statusBadge.color} ${statusBadge.ring}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-white">{s.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {stageDone}/{stageTotal} 완료
                </p>

                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.status === "DONE"
                        ? "bg-emerald-400"
                        : s.status === "ACTIVE"
                          ? "bg-violet-400"
                          : "bg-zinc-600"
                    }`}
                    style={{ width: `${stagePct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </section>

        {/* 안내 */}
        <p className="text-xs text-zinc-500">
          단계 카드를 클릭하면 체크리스트가 열립니다. 각 항목 옆 [🤝 도움받기] 버튼으로 외주·AC 컨설팅·팀 모집 글을 AI가 자동 작성해 커뮤니티에 게시합니다.
        </p>
      </div>

      {/* 단계 상세 모달 */}
      {openStage ? (
        <StageDetail
          stage={openStage}
          ideaTitle={idea.titleKo}
          onClose={() => setOpenStageId(null)}
          onChanged={refresh}
        />
      ) : null}
    </AuthGuard>
  );
}
