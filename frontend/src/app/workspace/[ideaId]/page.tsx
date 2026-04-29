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
  const [view, setView] = useState<"focus" | "grid">("focus");

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

  // 진척 통계
  const total = stages.reduce((acc, s) => acc + s.tasks.length, 0);
  const done = stages.reduce(
    (acc, s) =>
      acc +
      s.tasks.filter((t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED").length,
    0,
  );
  const overallPct = total === 0 ? 0 : Math.round((done / total) * 100);

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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView("focus")}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                ← 지금 할 일만
              </button>
              <div className="text-right">
                <p className="display-num text-4xl text-emerald-300 sm:text-5xl">{overallPct}%</p>
                <p className="mt-1 text-xs text-zinc-500">전체 진척 ({done}/{total})</p>
              </div>
            </div>
          </div>
        </header>

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
          단계 카드를 클릭하면 체크리스트가 열립니다. 각 항목 옆 [🛠 외주] 버튼으로 커뮤니티에 자동 게시할 수 있어요.
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
