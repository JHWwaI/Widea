"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import OutsourceModal from "@/components/workspace/OutsourceModal";
import { STAGE_RESOURCES } from "@/data/stageResources";
import type { WorkspaceStage, WorkspaceTask } from "@/app/workspace/[ideaId]/page";

export default function StageDetail({
  stage,
  ideaTitle,
  onClose,
  onChanged,
}: {
  stage: WorkspaceStage;
  ideaTitle: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newTask, setNewTask] = useState("");
  const [outsourceTask, setOutsourceTask] = useState<WorkspaceTask | null>(null);

  async function toggleStatus(task: WorkspaceTask, next: WorkspaceTask["status"]) {
    if (!token) return;
    setBusy(task.id);
    setError("");
    try {
      await api(
        "PATCH",
        `/api/workspace/tasks/${task.id}`,
        { status: next },
        token,
      );
      onChanged();
    } catch (caught) {
      setError(readError(caught, "변경 실패."));
    } finally {
      setBusy(null);
    }
  }

  async function addTask() {
    if (!token || !newTask.trim()) return;
    setBusy("add");
    setError("");
    try {
      await api(
        "POST",
        `/api/workspace/stages/${stage.id}/tasks`,
        { content: newTask.trim() },
        token,
      );
      setNewTask("");
      onChanged();
    } catch (caught) {
      setError(readError(caught, "추가 실패."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteTask(task: WorkspaceTask) {
    if (!token) return;
    if (!task.isCustom) return;
    if (!confirm("이 항목을 삭제할까요?")) return;
    setBusy(task.id);
    try {
      await api("DELETE", `/api/workspace/tasks/${task.id}`, undefined, token);
      onChanged();
    } catch (caught) {
      setError(readError(caught, "삭제 실패."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 top-12 z-50 mx-auto w-full max-w-3xl overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 shadow-2xl sm:inset-x-4 sm:top-16 sm:rounded-3xl lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[700px]">
        <div className="flex h-full max-h-[calc(100vh-3rem)] flex-col">
          {/* Header */}
          <header className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-violet-300">
                {ideaTitle}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                <span className="text-zinc-600">0{stage.stageNumber}.</span> {stage.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {/* Tasks scroll */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {/* 이 단계에서 필요한 리소스 (정적 큐레이션) */}
            <StageResourcesBox stageNumber={stage.stageNumber} />

            {/* 체크리스트 */}
            <div className="space-y-2">
            {stage.tasks.length === 0 ? (
              <p className="text-sm text-zinc-500">아직 task가 없습니다.</p>
            ) : (
              stage.tasks.map((t) => {
                const checked = t.status === "DONE" || t.status === "SKIPPED" || t.status === "OUTSOURCED";
                return (
                  <div
                    key={t.id}
                    className={`group flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                      checked ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      disabled={busy === t.id}
                      onClick={() =>
                        toggleStatus(t, t.status === "DONE" ? "PENDING" : "DONE")
                      }
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        t.status === "DONE"
                          ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                          : t.status === "OUTSOURCED"
                            ? "border-violet-400 bg-violet-400 text-zinc-950"
                            : t.status === "SKIPPED"
                              ? "border-zinc-600 bg-zinc-700 text-zinc-300"
                              : "border-zinc-600 hover:border-emerald-400"
                      }`}
                      title={
                        t.status === "DONE"
                          ? "완료됨 (클릭하면 해제)"
                          : t.status === "OUTSOURCED"
                            ? "외주 진행 중"
                            : "완료로 표시"
                      }
                    >
                      {t.status === "DONE" ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : t.status === "OUTSOURCED" ? (
                        <span className="text-[0.5rem] font-black">外</span>
                      ) : t.status === "SKIPPED" ? (
                        <span className="text-[0.5rem]">—</span>
                      ) : null}
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-6 ${checked ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                        {t.content}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {t.outsourceRole ? (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[0.65rem] text-zinc-300">
                            🛠 {t.outsourceRole}
                          </span>
                        ) : null}
                        {t.isCustom ? (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[0.65rem] text-zinc-400">
                            사용자 추가
                          </span>
                        ) : null}
                        {t.orderIndex >= 100 ? (
                          <span className="rounded bg-zinc-700/40 px-1.5 py-0.5 text-[0.65rem] font-semibold text-zinc-300">
                            선택
                          </span>
                        ) : null}
                        {t.status === "OUTSOURCED" && t.communityPostId ? (
                          <a
                            href={`/community/${t.communityPostId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.7rem] font-semibold text-violet-300 hover:underline"
                          >
                            외주 글 보기 →
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {t.outsourceRole && t.status !== "OUTSOURCED" ? (
                        <button
                          type="button"
                          onClick={() => setOutsourceTask(t)}
                          className="rounded-md border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[0.7rem] font-semibold text-violet-200 hover:bg-violet-500/20"
                        >
                          🤝 도움받기
                        </button>
                      ) : null}
                      {t.status !== "SKIPPED" && t.status !== "DONE" ? (
                        <button
                          type="button"
                          onClick={() => toggleStatus(t, "SKIPPED")}
                          className="rounded-md border border-white/10 px-2 py-1 text-[0.7rem] text-zinc-400 hover:bg-white/5"
                          title="이 항목 건너뛰기"
                        >
                          —
                        </button>
                      ) : null}
                      {t.isCustom ? (
                        <button
                          type="button"
                          onClick={() => deleteTask(t)}
                          className="rounded-md px-2 py-1 text-[0.7rem] text-rose-300 hover:bg-rose-500/10"
                        >
                          삭제
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>

          {/* Add task */}
          <footer className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="새 항목 추가 (예: 사업자등록 후 카카오 챗봇 연동 검토)"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
              />
              <button
                type="button"
                onClick={addTask}
                disabled={!newTask.trim() || busy === "add"}
                className="btn-secondary px-4"
              >
                추가
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* 외주 모달 */}
      {outsourceTask ? (
        <OutsourceModal
          task={outsourceTask}
          onClose={() => setOutsourceTask(null)}
          onPosted={() => {
            setOutsourceTask(null);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

/* ─── 단계별 리소스 박스 (목적별 그룹 + 결과 한 줄) ────────── */
function StageResourcesBox({ stageNumber }: { stageNumber: number }) {
  const res = STAGE_RESOURCES[stageNumber];
  if (!res || !res.groups || res.groups.length === 0) return null;
  const totalItems = res.groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="space-y-4 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] to-violet-500/[0.02] p-5">
      {/* 헤더 + 다음 액션 */}
      <header className="space-y-1.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-violet-300">
          이 단계에서 진짜 필요한 것 · 도구 {totalItems}개
        </p>
        {res.nextAction ? (
          <p className="text-base font-bold leading-snug text-white">
            ✦ {res.nextAction}
          </p>
        ) : null}
      </header>

      {/* 목적별 그룹 */}
      <div className="space-y-5">
        {res.groups.map((g) => (
          <div key={g.title} className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-base">{g.icon}</span>
              <h4 className="text-sm font-bold text-white">{g.title}</h4>
              {g.description ? (
                <span className="text-xs text-zinc-500">— {g.description}</span>
              ) : null}
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {g.items.map((item, i) => (
                <li key={`${item.url}-${i}`}>
                  <ResourceItem item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceItem({
  item,
}: {
  item: { label: string; url: string; outcome?: string; badge?: string };
}) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-all hover:border-violet-400/40 hover:bg-violet-500/[0.08]"
    >
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-sm font-bold text-white group-hover:text-violet-100">
          {item.label}
        </span>
        {item.badge ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wider ${
              item.badge === "정부"
                ? "bg-amber-500/15 text-amber-300"
                : item.badge === "한국"
                  ? "bg-rose-500/15 text-rose-300"
                  : item.badge === "무료"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : item.badge === "추천"
                      ? "bg-violet-500/25 text-violet-100"
                      : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {item.badge}
          </span>
        ) : null}
      </div>
      {item.outcome ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-400 group-hover:text-zinc-300">
          → {item.outcome}
        </p>
      ) : null}
    </a>
  );
}
