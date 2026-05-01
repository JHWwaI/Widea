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
  const [activeTab, setActiveTab] = useState<"stages" | "help">("stages");

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
      <div className="mx-auto max-w-5xl fade-up py-4 pb-16">
        {/* Breadcrumb */}
        <Link
          href={`/ideas/${idea.id}`}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← 아이디어 상세
        </Link>

        {/* 헤더 — 한 줄 layout: 제목 좌 / 진척률 우 */}
        <header className="mt-6 border-b border-white/[0.06] pb-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">워크스페이스</p>
              <h1 className="mt-2 text-balance text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-3xl">
                {idea.titleKo}
              </h1>
              {idea.oneLinerKo ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  {idea.oneLinerKo}
                </p>
              ) : null}
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline justify-end gap-1">
                <span className="display-num text-3xl text-white sm:text-4xl">{overallPct}</span>
                <span className="text-base font-semibold text-zinc-600">%</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{done} / {total} 작업</p>
            </div>
          </div>

          {/* 가로 진척 바 + 6단계 stepper */}
          <div className="mt-6 space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="grid grid-cols-6 gap-1">
              {stages.map((s) => {
                const sTotal = s.tasks.filter((t) => t.orderIndex < 100).length;
                const sDone = s.tasks.filter(
                  (t) => t.orderIndex < 100 && t.status !== "PENDING",
                ).length;
                const sPct = sTotal === 0 ? 0 : (sDone / sTotal) * 100;
                const isComplete = sTotal > 0 && sDone === sTotal;
                return (
                  <div
                    key={s.id}
                    className="h-0.5 overflow-hidden rounded-full bg-white/[0.04]"
                  >
                    <div
                      className={`h-full rounded-full ${
                        isComplete ? "bg-white" : "bg-white/40"
                      }`}
                      style={{ width: `${sPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {/* 다음 할 일 Hero — 가장 큰 CTA, dramatic */}
        {allDone ? (
          <section className="mt-10 border-b border-white/[0.06] pb-10 text-center">
            <p className="eyebrow">완료</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              모든 단계 완료
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {total}개 작업을 모두 처리했습니다
            </p>
            <Link
              href={`/show/${idea.id}`}
              className="mt-6 inline-flex rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
            >
              사업 페이지 공유하기
            </Link>
          </section>
        ) : nextTask && nextStage ? (
          <section className="mt-12 border-b border-white/[0.06] pb-12">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">지금 할 일</p>
              <p className="text-xs text-zinc-500">
                0{nextStage.stageNumber} {nextStage.name}
              </p>
            </div>
            <h2 className="mt-3 text-balance text-xl font-bold leading-[1.2] tracking-tight text-white sm:text-2xl">
              {nextTask.content}
            </h2>
            {nextTask.outsourceRole ? (
              <p className="mt-3 text-sm text-zinc-500">
                외주 가능 · {nextTask.outsourceRole}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setView("focus")}
              className="mt-6 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
            >
              이 작업 시작하기 →
            </button>
          </section>
        ) : null}

        {/* 탭: 6단계 여정 / 도움받기 */}
        <section className="mt-12">
          <div className="flex items-center gap-1 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab("stages")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "stages"
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              6단계 여정
              {activeTab === "stages" ? (
                <span className="absolute bottom-[-1px] left-0 right-0 h-px bg-white" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("help")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "help"
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              도움받기
              {activeTab === "help" ? (
                <span className="absolute bottom-[-1px] left-0 right-0 h-px bg-white" />
              ) : null}
            </button>
            <span className="ml-auto text-xs text-zinc-500">
              {activeTab === "stages"
                ? "단계 클릭 · 체크리스트 열기"
                : "커뮤니티에 게시 · 응답 받기"}
            </span>
          </div>

          {/* 6단계 그리드 */}
          {activeTab === "stages" ? (
            <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
              {stages.map((s) => {
                const stageTotal = s.tasks.filter((t) => t.orderIndex < 100).length;
                const stageDone = s.tasks.filter(
                  (t) =>
                    t.orderIndex < 100 &&
                    (t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED"),
                ).length;
                const stagePct = stageTotal === 0 ? 0 : Math.round((stageDone / stageTotal) * 100);
                const isComplete = stageTotal > 0 && stageDone === stageTotal;
                const isActive = s.status === "ACTIVE";

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setOpenStageId(s.id)}
                    className="group flex min-h-[160px] flex-col bg-zinc-950 p-6 text-left transition-colors hover:bg-white/[0.025]"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="display-num text-3xl text-white/[0.18]">
                        0{s.stageNumber}
                      </span>
                      <span
                        className={`text-[0.65rem] font-medium uppercase tracking-wider ${
                          isComplete
                            ? "text-white"
                            : isActive
                              ? "text-zinc-300"
                              : "text-zinc-600"
                        }`}
                      >
                        {isComplete ? "완료" : isActive ? "진행 중" : "대기"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-white">{s.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {stageDone} / {stageTotal} 작업
                    </p>

                    <div className="mt-auto pt-5">
                      <div className="h-px overflow-hidden bg-white/[0.06]">
                        <div
                          className={`h-full transition-all ${
                            isComplete
                              ? "bg-white"
                              : isActive
                                ? "bg-white/70"
                                : "bg-white/30"
                          }`}
                          style={{ width: `${stagePct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* 도움받기 3-허브 */}
          {activeTab === "help" ? (
            <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-3">
              <Link
                href={`/community/new?category=OUTSOURCE_REQUEST&title=${encodeURIComponent(`[${idea.titleKo}] 외주 의뢰`)}`}
                className="group bg-zinc-950 p-6 transition-colors hover:bg-white/[0.025]"
              >
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">외주</p>
                <h3 className="mt-2 text-base font-semibold text-white">외주 의뢰</h3>
                <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                  디자이너·개발자·마케터에게 작업 요청
                </p>
                <p className="mt-4 text-xs font-medium text-zinc-300 group-hover:text-white">
                  글 작성하기 →
                </p>
              </Link>

              <Link
                href={`/community/new?category=AC_REQUEST&title=${encodeURIComponent(`[${idea.titleKo}] AC·멘토 컨설팅 요청`)}`}
                className="group bg-zinc-950 p-6 transition-colors hover:bg-white/[0.025]"
              >
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">컨설팅</p>
                <h3 className="mt-2 text-base font-semibold text-white">AC·멘토</h3>
                <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                  엑셀러레이터·멘토 매칭으로 검증
                </p>
                <p className="mt-4 text-xs font-medium text-zinc-300 group-hover:text-white">
                  글 작성하기 →
                </p>
              </Link>

              <Link
                href={`/community/new?category=TEAM_RECRUIT&title=${encodeURIComponent(`[${idea.titleKo}] 팀원 모집`)}`}
                className="group bg-zinc-950 p-6 transition-colors hover:bg-white/[0.025]"
              >
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">팀원</p>
                <h3 className="mt-2 text-base font-semibold text-white">팀원 모집</h3>
                <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                  공동창업자·개발자·기획자 영입
                </p>
                <p className="mt-4 text-xs font-medium text-zinc-300 group-hover:text-white">
                  글 작성하기 →
                </p>
              </Link>
            </div>
          ) : null}
        </section>

        {/* 안내 */}
        <p className="mt-6 text-xs text-zinc-500">
          {activeTab === "stages"
            ? "단계 카드를 클릭하면 체크리스트가 열립니다. 각 항목 옆 [도움받기] 버튼으로 외주·AC 컨설팅·팀 모집 글 초안이 자동 작성됩니다."
            : "글 작성하면 커뮤니티에 게시되어 다른 사용자가 응답·지원할 수 있습니다."}
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
