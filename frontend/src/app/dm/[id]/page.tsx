"use client";

/**
 * 단일 DM 채팅창 — 워크스페이스 의존성 없이 1:1 메시지만 보고 답장 가능.
 * 알림함의 DM 카드, 또는 글에서 [DM 시작] 후 갈 곳이 없을 때 fallback.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import AddPeerToWorkspaceButton from "@/components/messenger/AddPeerToWorkspaceButton";
import AddTaskModal from "@/components/workspace/AddTaskModal";

type Peer = { id: string; name: string | null; email: string; userCode: string | null };
type DmMessage = {
  id: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function peerLabel(p: Peer): string {
  return p.name || p.email || (p.userCode ?? "사용자");
}

function peerInitial(p: Peer): string {
  const s = peerLabel(p).trim();
  return s ? s[0].toUpperCase() : "?";
}

function groupKakao(messages: DmMessage[]): Array<{ senderId: string; items: DmMessage[] }> {
  const groups: Array<{ senderId: string; items: DmMessage[] }> = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    const sameSender = last && last.senderId === m.senderId;
    const sameMinute =
      last &&
      sameSender &&
      Math.abs(
        new Date(m.createdAt).getTime() -
          new Date(last.items[last.items.length - 1].createdAt).getTime(),
      ) < 60_000;
    if (sameSender && sameMinute) last.items.push(m);
    else groups.push({ senderId: m.senderId, items: [m] });
  }
  return groups;
}

export default function SingleDmPage() {
  return (
    <AuthGuard>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const { id: rawId } = useParams<{ id: string }>();
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const res = await api<{ peer: Peer; messages: DmMessage[] }>(
        "GET",
        `/api/dm/conversations/${conversationId}/messages`,
        undefined,
        token,
      );
      setMessages(res.messages);
      setPeer(res.peer);
      await api("POST", `/api/dm/conversations/${conversationId}/read`, undefined, token);
    } catch (caught) {
      setError(readError(caught, "대화를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [token, conversationId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!token || !conversationId) return;
    const content = inputRef.current?.value.trim() ?? "";
    if (!content) return;
    try {
      await api(
        "POST",
        `/api/dm/conversations/${conversationId}/messages`,
        { content },
        token,
      );
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (caught) {
      setError(readError(caught, "전송 실패"));
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-var(--navbar-height)-6rem)] min-h-[600px] max-w-3xl flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <Link href="/mypage/inbox" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← 알림함
        </Link>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {peer ? (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-violet-700/30 text-sm font-bold text-white">
                {peerInitial(peer)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{peerLabel(peer)}</p>
                <p className="truncate text-[0.65rem] text-zinc-500">
                  {peer.userCode ? `ID ${peer.userCode}` : null}
                  {peer.userCode && peer.email ? " · " : null}
                  {peer.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTask(true)}
                className="shrink-0 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[0.65rem] font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                + 일정
              </button>
              <AddPeerToWorkspaceButton peerUserId={peer.id} peerName={peerLabel(peer)} />
            </>
          ) : (
            <p className="text-xs text-zinc-500">불러오는 중...</p>
          )}
        </div>

        {/* 메시지 — 카톡 스타일 */}
        <div className="flex-1 overflow-y-auto bg-[#1a1a22] px-4 py-3 space-y-3">
          {loading && messages.length === 0 ? (
            <p className="text-xs text-zinc-500">불러오는 중...</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-500">첫 메시지를 보내보세요.</p>
          ) : (
            groupKakao(messages).map((g, gi) => {
              const mine = g.senderId === user?.id;
              return (
                <div
                  key={`${g.senderId}-${gi}`}
                  className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!mine && peer ? (
                    <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-violet-700/30 text-[0.65rem] font-bold text-white">
                      {peerInitial(peer)}
                    </div>
                  ) : null}
                  <div className={`flex max-w-[75%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                    {g.items.map((m, mi) => {
                      const isLast = mi === g.items.length - 1;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <div
                            className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                              mine ? "bg-[#FAE100] text-zinc-900" : "bg-white text-zinc-900"
                            }`}
                          >
                            {m.content}
                          </div>
                          {isLast ? (
                            <span className="mb-0.5 flex flex-col items-end gap-0.5 text-[0.6rem] text-zinc-500">
                              {mine && !m.readAt ? (
                                <span className="font-bold text-amber-300">1</span>
                              ) : null}
                              <span>{formatTime(m.createdAt)}</span>
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력 */}
        <div className="border-t border-white/10 bg-[#1a1a22] p-2.5">
          <div className="flex items-end gap-2 rounded-2xl bg-white/[0.06] p-1.5">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="메시지를 입력하세요"
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              className="rounded-xl bg-[#FAE100] px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-[#FFE600]"
            >
              전송
            </button>
          </div>
        </div>
      </section>

      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        defaultAssigneeId={peer?.id}
      />
    </div>
  );
}
