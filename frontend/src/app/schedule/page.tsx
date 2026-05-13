"use client";

/**
 * 종합 일정 — 사이드바 단독 메뉴.
 * 내가 owner이거나 멤버인 모든 워크스페이스의 task를 통합해
 * 시간순/내 일/기한 초과 등으로 필터링·관리.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import AddTaskModal from "@/components/workspace/AddTaskModal";

type TaskStatus = "PENDING" | "DONE" | "SKIPPED" | "OUTSOURCED";

type FlatTask = {
  id: string;
  stageId: string;
  ideaId: string;
  ideaTitle: string;
  stageNumber: number;
  stageName: string;
  content: string;
  status: TaskStatus;
  outsourceRole: string | null;
  communityPostId: string | null;
  orderIndex: number;
  assigneeId: string | null;
  assignee: { id: string; name: string | null; email: string; userCode: string | null } | null;
  dueDate: string | null;
  notes: string | null;
};

type WorkspaceItem = { ideaId: string; title: string };

type Filter = "all" | "mine" | "due_soon" | "overdue" | "completed";
type ViewMode = "calendar" | "timeline" | "byWorkspace";

type TimeBucket = "OVERDUE" | "TODAY" | "TOMORROW" | "THIS_WEEK" | "THIS_MONTH" | "LATER" | "NO_DUE";

const BUCKET_META: Record<TimeBucket, { label: string; ring: string; tone: string }> = {
  OVERDUE:    { label: "기한 초과", ring: "ring-rose-400/30",   tone: "text-rose-300" },
  TODAY:      { label: "오늘 마감", ring: "ring-amber-400/30",  tone: "text-amber-300" },
  TOMORROW:   { label: "내일 마감", ring: "ring-amber-400/20",  tone: "text-amber-200" },
  THIS_WEEK:  { label: "이번 주",   ring: "ring-violet-400/30", tone: "text-violet-200" },
  THIS_MONTH: { label: "이번 달",   ring: "ring-violet-400/15", tone: "text-zinc-300" },
  LATER:      { label: "이후",      ring: "ring-white/10",      tone: "text-zinc-400" },
  NO_DUE:     { label: "기한 없음", ring: "ring-white/5",       tone: "text-zinc-500" },
};

function classifyBucket(due: string | null, status: TaskStatus, today: Date): TimeBucket {
  if (status !== "PENDING") return "NO_DUE";
  if (!due) return "NO_DUE";
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "OVERDUE";
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "TOMORROW";
  if (diffDays <= 7) return "THIS_WEEK";
  if (diffDays <= 30) return "THIS_MONTH";
  return "LATER";
}

function dueText(due: string | null): { text: string; cn: string } {
  if (!due) return { text: "기한 없음", cn: "text-zinc-600" };
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dt = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  if (diff < 0) return { text: `${dt} · ${-diff}일 지남`, cn: "text-rose-300" };
  if (diff === 0) return { text: `${dt} · 오늘`, cn: "text-amber-300" };
  if (diff === 1) return { text: `${dt} · 내일`, cn: "text-amber-200" };
  if (diff <= 7) return { text: `${dt} · ${diff}일 후`, cn: "text-zinc-300" };
  return { text: dt, cn: "text-zinc-500" };
}

export default function SchedulePage() {
  return (
    <AuthGuard>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<FlatTask[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<ViewMode>("calendar");
  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [openDate, setOpenDate] = useState<string | null>(null); // YYYY-MM-DD
  const [wsFilter, setWsFilter] = useState<string | null>(null); // 특정 워크스페이스만 필터
  const [showAddModal, setShowAddModal] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api<{ workspaces: WorkspaceItem[]; tasks: FlatTask[] }>(
        "GET",
        "/api/workspace/all-tasks",
        undefined,
        token,
      );
      setWorkspaces(res.workspaces);
      setTasks(res.tasks);
    } catch (caught) {
      setError(readError(caught, "일정 불러오기 실패"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    if (!token) return;
    setSaving(true);
    try {
      await api("PATCH", `/api/workspace/tasks/${taskId}`, patch, token);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(taskId: string) {
    if (!token) return;
    setSaving(true);
    try {
      await api("DELETE", `/api/workspace/tasks/${taskId}`, undefined, token);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  // 캘린더 셀 클릭 후 [+ 추가] 시 그날 마감일 prefill로 AddTaskModal 열기
  const [addPrefillDate, setAddPrefillDate] = useState<string>("");
  function handleAddNewOnDate(date: string) {
    setAddPrefillDate(date);
    setOpenDate(null);
    setShowAddModal(true);
  }

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // 필터 적용
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (wsFilter && t.ideaId !== wsFilter) return false;
      if (filter === "mine" && t.assigneeId !== user?.id) return false;
      if (filter === "completed") {
        if (t.status !== "DONE" && t.status !== "OUTSOURCED" && t.status !== "SKIPPED") return false;
      }
      if (filter === "overdue") {
        if (t.status !== "PENDING" || !t.dueDate) return false;
        if (new Date(t.dueDate) >= today) return false;
      }
      if (filter === "due_soon") {
        if (t.status !== "PENDING" || !t.dueDate) return false;
        const diff = (new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        if (diff < 0 || diff > 7) return false;
      }
      return true;
    });
  }, [tasks, filter, user, today, wsFilter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED").length;
    const overdue = tasks.filter((t) => t.status === "PENDING" && t.dueDate && new Date(t.dueDate) < today).length;
    const dueSoon = tasks.filter((t) => {
      if (t.status !== "PENDING" || !t.dueDate) return false;
      const diff = (new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const mine = user ? tasks.filter((t) => t.assigneeId === user.id && t.status === "PENDING").length : 0;
    return { total, done, overdue, dueSoon, mine };
  }, [tasks, today, user]);

  // 시간순 — 버킷 그룹
  const timelineGroups = useMemo(() => {
    const buckets: Record<TimeBucket, FlatTask[]> = {
      OVERDUE: [], TODAY: [], TOMORROW: [], THIS_WEEK: [], THIS_MONTH: [], LATER: [], NO_DUE: [],
    };
    for (const t of visibleTasks) {
      const b = classifyBucket(t.dueDate, t.status, today);
      buckets[b].push(t);
    }
    for (const k of Object.keys(buckets) as TimeBucket[]) {
      buckets[k].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return buckets;
  }, [visibleTasks, today]);

  // 워크스페이스별 그룹
  const byWorkspace = useMemo(() => {
    const map = new Map<string, { ideaId: string; title: string; tasks: FlatTask[] }>();
    for (const w of workspaces) {
      map.set(w.ideaId, { ideaId: w.ideaId, title: w.title, tasks: [] });
    }
    for (const t of visibleTasks) {
      map.get(t.ideaId)?.tasks.push(t);
    }
    return Array.from(map.values()).filter((g) => g.tasks.length > 0);
  }, [visibleTasks, workspaces]);

  function FilterChip({ value, label, count, accent }: { value: Filter; label: string; count: number; accent?: string }) {
    const active = filter === value;
    return (
      <button
        type="button"
        onClick={() => setFilter(value)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          active
            ? "bg-violet-500 text-white"
            : "border border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]"
        }`}
      >
        <span>{label}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums ${active ? "bg-white/20 text-white" : accent ?? "bg-zinc-700 text-zinc-300"}`}>
          {count}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-violet-300">
              종합 일정
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">내 모든 워크스페이스의 할 일</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {workspaces.length}개 워크스페이스 · {stats.total}개 작업 · 완료 {stats.done}개{" "}
              {stats.total > 0 ? <span className="text-zinc-500">({Math.round((stats.done / stats.total) * 100)}%)</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-100 hover:bg-violet-500/25"
          >
            + 일정 추가
          </button>
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-md px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${view === "calendar" ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              캘린더
            </button>
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={`rounded-md px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${view === "timeline" ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              시간순
            </button>
            <button
              type="button"
              onClick={() => setView("byWorkspace")}
              className={`rounded-md px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${view === "byWorkspace" ? "bg-violet-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              워크스페이스별
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip value="all" label="전체" count={stats.total} />
          <FilterChip value="mine" label="내 일" count={stats.mine} accent="bg-violet-500/20 text-violet-200" />
          <FilterChip value="due_soon" label="이번주" count={stats.dueSoon} accent="bg-amber-500/20 text-amber-200" />
          <FilterChip value="overdue" label="기한 초과" count={stats.overdue} accent="bg-rose-500/20 text-rose-200" />
          <FilterChip value="completed" label="완료" count={stats.done} accent="bg-emerald-500/20 text-emerald-200" />
        </div>

        {/* 워크스페이스 필터 */}
        {workspaces.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
              워크스페이스
            </span>
            <button
              type="button"
              onClick={() => setWsFilter(null)}
              className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition-colors ${!wsFilter ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40" : "border border-white/10 text-zinc-400 hover:text-zinc-200"}`}
            >
              전체
            </button>
            {workspaces.map((w) => {
              const active = wsFilter === w.ideaId;
              return (
                <button
                  key={w.ideaId}
                  type="button"
                  onClick={() => setWsFilter(w.ideaId)}
                  className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold transition-colors ${active ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40" : "border border-white/10 text-zinc-400 hover:text-zinc-200"}`}
                >
                  {w.title}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">불러오는 중...</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">아직 워크스페이스가 없거나 작업이 없습니다.</p>
          <Link
            href="/idea-match"
            className="mt-4 inline-block rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/25"
          >
            아이디어 만들러 가기
          </Link>
        </div>
      ) : view === "calendar" ? (
        <CalendarView
          tasks={visibleTasks}
          workspaces={workspaces}
          cursor={calCursor}
          onCursorChange={setCalCursor}
          openDate={openDate}
          onOpenDate={setOpenDate}
          onToggleDone={(t) => patchTask(t.id, { status: t.status === "DONE" ? "PENDING" : "DONE" })}
          onPatch={patchTask}
          onDelete={deleteTask}
          onAddNewOnDate={handleAddNewOnDate}
          saving={saving}
        />
      ) : view === "timeline" ? (
        <div className="space-y-3">
          {(["OVERDUE", "TODAY", "TOMORROW", "THIS_WEEK", "THIS_MONTH", "LATER", "NO_DUE"] as TimeBucket[]).map((bucket) => {
            const items = timelineGroups[bucket];
            if (items.length === 0) return null;
            const meta = BUCKET_META[bucket];
            return (
              <BucketSection
                key={bucket}
                title={meta.label}
                ring={meta.ring}
                tone={meta.tone}
                items={items}
                onToggleDone={(t) =>
                  patchTask(t.id, { status: t.status === "DONE" ? "PENDING" : "DONE" })
                }
                saving={saving}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {byWorkspace.map((g) => (
            <BucketSection
              key={g.ideaId}
              title={g.title}
              titleHref={`/workspace/${g.ideaId}`}
              ring="ring-violet-400/20"
              tone="text-violet-200"
              items={g.tasks}
              onToggleDone={(t) =>
                patchTask(t.id, { status: t.status === "DONE" ? "PENDING" : "DONE" })
              }
              saving={saving}
            />
          ))}
        </div>
      )}

      <AddTaskModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddPrefillDate("");
        }}
        onCreated={refresh}
        defaultDueDate={addPrefillDate || undefined}
      />
    </div>
  );
}

function BucketSection({
  title,
  titleHref,
  ring,
  tone,
  items,
  onToggleDone,
  saving,
}: {
  title: string;
  titleHref?: string;
  ring: string;
  tone: string;
  items: FlatTask[];
  onToggleDone: (t: FlatTask) => void;
  saving: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] ring-1 ${ring}`}>
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-2">
        {titleHref ? (
          <Link href={titleHref} className={`flex items-center gap-2 text-sm font-bold ${tone} hover:underline`}>
            {title} →
          </Link>
        ) : (
          <p className={`flex items-center gap-2 text-sm font-bold ${tone}`}>{title}</p>
        )}
        <span className="text-[0.65rem] tabular-nums text-zinc-500">{items.length}개</span>
      </div>
      <ul>
        {items.map((task) => {
          const due = dueText(task.dueDate);
          const completed = task.status === "DONE" || task.status === "SKIPPED" || task.status === "OUTSOURCED";
          return (
            <li key={task.id} className="flex items-start gap-3 border-t border-white/[0.04] px-4 py-2.5 hover:bg-white/[0.02] first:border-t-0">
              <button
                type="button"
                onClick={() => onToggleDone(task)}
                disabled={saving}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  task.status === "DONE"
                    ? "border-emerald-400/50 bg-emerald-500/30 text-emerald-200"
                    : "border-white/15 hover:border-violet-400/40 hover:bg-violet-500/10"
                }`}
              >
                {task.status === "DONE" ? "✓" : ""}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug ${completed ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                  {task.content}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.65rem] text-zinc-500">
                  <Link href={`/workspace/${task.ideaId}`} className="hover:text-violet-200">
                    {task.ideaTitle}
                  </Link>
                  <span>·</span>
                  <span>0{task.stageNumber}. {task.stageName}</span>
                  {task.assignee ? (
                    <>
                      <span>·</span>
                      <span className="text-violet-200">👤 {task.assignee.name ?? task.assignee.email.split("@")[0]}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span className={due.cn}>{due.text}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────
   노션 스타일 월 캘린더 — 워크스페이스별 색상 막대
   ───────────────────────────────────────────── */

const WS_COLORS = [
  "bg-violet-500/30 text-violet-100 border-violet-400/40",
  "bg-emerald-500/30 text-emerald-100 border-emerald-400/40",
  "bg-amber-500/30 text-amber-100 border-amber-400/40",
  "bg-rose-500/30 text-rose-100 border-rose-400/40",
  "bg-sky-500/30 text-sky-100 border-sky-400/40",
  "bg-pink-500/30 text-pink-100 border-pink-400/40",
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dueYmd(iso: string | null): string | null {
  if (!iso) return null;
  return ymd(new Date(iso));
}

function CalendarView({
  tasks,
  workspaces,
  cursor,
  onCursorChange,
  openDate,
  onOpenDate,
  onToggleDone,
  onPatch,
  onDelete,
  onAddNewOnDate,
  saving,
}: {
  tasks: FlatTask[];
  workspaces: WorkspaceItem[];
  cursor: Date;
  onCursorChange: (d: Date) => void;
  openDate: string | null;
  onOpenDate: (d: string | null) => void;
  onToggleDone: (t: FlatTask) => void;
  onPatch: (taskId: string, patch: Record<string, unknown>) => void;
  onDelete: (taskId: string) => void;
  onAddNewOnDate: (date: string) => void;
  saving: boolean;
}) {
  // 워크스페이스 → 색상 인덱스 매핑
  const wsColor = useMemo(() => {
    const map = new Map<string, string>();
    workspaces.forEach((w, i) => map.set(w.ideaId, WS_COLORS[i % WS_COLORS.length]));
    return map;
  }, [workspaces]);

  // 그리드 첫 셀(이전 달 뒷부분) ~ 마지막 셀
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const startWeekday = first.getDay(); // 0=Sun
    const cells: Date[] = [];
    // 이전 달 채우기
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      cells.push(d);
    }
    // 현재 달
    for (let i = 1; i <= lastDay; i++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    }
    // 다음 달 채우기 (총 42칸)
    while (cells.length < 42) {
      const last = cells[cells.length - 1];
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  // 날짜별 task 그룹
  const byDate = useMemo(() => {
    const map = new Map<string, FlatTask[]>();
    for (const t of tasks) {
      const k = dueYmd(t.dueDate);
      if (!k) continue;
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return map;
  }, [tasks]);

  const todayStr = ymd(new Date());
  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;
  const openTasks = openDate ? byDate.get(openDate) ?? [] : [];

  return (
    <div className="space-y-3">
      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(cursor);
              d.setMonth(d.getMonth() - 1);
              onCursorChange(d);
            }}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-300 hover:bg-white/[0.06]"
            aria-label="이전 달"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              onCursorChange(d);
            }}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06]"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date(cursor);
              d.setMonth(d.getMonth() + 1);
              onCursorChange(d);
            }}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-300 hover:bg-white/[0.06]"
            aria-label="다음 달"
          >
            ›
          </button>
          <h2 className="ml-2 text-base font-bold text-white">{monthLabel}</h2>
        </div>

        {/* 워크스페이스 색 범례 */}
        {workspaces.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {workspaces.slice(0, 6).map((w) => {
              const cls = wsColor.get(w.ideaId) ?? WS_COLORS[0];
              return (
                <span
                  key={w.ideaId}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${cls}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {w.title.length > 10 ? w.title.slice(0, 10) + "…" : w.title}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* 캘린더 그리드 */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <div
              key={d}
              className={`px-2 py-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-wider ${
                i === 0 ? "text-rose-300" : i === 6 ? "text-sky-300" : "text-zinc-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 6 × 7 셀 */}
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const k = ymd(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = k === todayStr;
            const dayTasks = byDate.get(k) ?? [];
            const wd = d.getDay();
            return (
              <button
                key={k + i}
                type="button"
                onClick={() => onOpenDate(k)}
                className={`flex min-h-[96px] flex-col items-stretch gap-0.5 border-b border-r border-white/5 p-1.5 text-left transition-colors hover:bg-white/[0.03] ${
                  inMonth ? "" : "bg-black/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-semibold ${
                      isToday
                        ? "bg-violet-500 text-white"
                        : !inMonth
                          ? "text-zinc-700"
                          : wd === 0
                            ? "text-rose-300"
                            : wd === 6
                              ? "text-sky-300"
                              : "text-zinc-300"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  {dayTasks.length > 0 ? (
                    <span className="text-[0.55rem] tabular-nums text-zinc-500">
                      {dayTasks.length}
                    </span>
                  ) : null}
                </div>

                {/* task 막대 (최대 3개) */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => {
                    const cls = wsColor.get(t.ideaId) ?? WS_COLORS[0];
                    const completed =
                      t.status === "DONE" ||
                      t.status === "OUTSOURCED" ||
                      t.status === "SKIPPED";
                    return (
                      <div
                        key={t.id}
                        className={`truncate rounded border px-1 py-0.5 text-[0.6rem] leading-tight ${cls} ${
                          completed ? "opacity-50 line-through" : ""
                        }`}
                        title={`${t.ideaTitle} · ${t.content}`}
                      >
                        {t.content}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 ? (
                    <p className="text-[0.55rem] text-zinc-500">+ {dayTasks.length - 3}개 더</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 셀 클릭 시 그날 task 모달 */}
      {openDate ? (
        <>
          <div
            role="button"
            tabIndex={-1}
            aria-label="닫기"
            onClick={() => onOpenDate(null)}
            onKeyDown={(e) => e.key === "Escape" && onOpenDate(null)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-base font-bold text-white">{openDate}</h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAddNewOnDate(openDate)}
                  className="rounded-md border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[0.7rem] font-bold text-violet-100 hover:bg-violet-500/25"
                >
                  + 추가
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDate(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-3">
              {openTasks.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-zinc-500">이 날에는 일정이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => onAddNewOnDate(openDate)}
                    className="mt-2 rounded-md border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-100 hover:bg-violet-500/25"
                  >
                    + 일정 추가
                  </button>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {openTasks.map((t) => {
                    const cls = wsColor.get(t.ideaId) ?? WS_COLORS[0];
                    const completed =
                      t.status === "DONE" ||
                      t.status === "OUTSOURCED" ||
                      t.status === "SKIPPED";
                    return (
                      <li
                        key={t.id}
                        className="group rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleDone(t)}
                            disabled={saving}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              t.status === "DONE"
                                ? "border-emerald-400/50 bg-emerald-500/30 text-emerald-200"
                                : "border-white/15 hover:border-violet-400/40"
                            }`}
                          >
                            {t.status === "DONE" ? "✓" : ""}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${completed ? "text-zinc-500 line-through" : "text-white"}`}>
                              {t.content}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.65rem]">
                              <span className={`rounded-full border px-1.5 py-0.5 ${cls}`}>
                                {t.ideaTitle}
                              </span>
                              <span className="text-zinc-500">0{t.stageNumber}. {t.stageName}</span>
                              {t.assignee ? (
                                <span className="text-violet-200">{t.assignee.name ?? t.assignee.email.split("@")[0]}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* 액션 행: 마감일 변경 + 삭제 */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
                          <label className="text-[0.6rem] text-zinc-500">마감일</label>
                          <input
                            type="date"
                            defaultValue={t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : ""}
                            onBlur={(e) => {
                              const v = e.target.value;
                              const cur = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "";
                              if (v !== cur) onPatch(t.id, { dueDate: v || null });
                            }}
                            className="rounded border border-white/10 bg-zinc-900 px-1.5 py-0.5 text-[0.65rem] text-zinc-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`"${t.content}" 일정을 삭제할까요?`)) {
                                onDelete(t.id);
                              }
                            }}
                            disabled={saving}
                            className="ml-auto rounded-md px-2 py-1 text-[0.65rem] text-rose-300 hover:bg-rose-500/10"
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

