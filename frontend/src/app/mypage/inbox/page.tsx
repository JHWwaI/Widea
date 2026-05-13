"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";
import CollabRequestsInbox from "@/components/CollabRequestsInbox";

type Author = { id: string; name: string | null; email: string };
type Post = { id: string; title: string; category: string };

type DmPeer = { id: string; name: string | null; email: string; userCode: string | null };
type DmConv = {
  id: string;
  peer: DmPeer;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type InboxComment = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  post: Post | undefined;
};

type InboxLike = {
  id: string;
  createdAt: string;
  user: Author;
  post: Post | undefined;
};

type InboxResponse = {
  comments: InboxComment[];
  likes: InboxLike[];
  total: number;
};

export default function InboxPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<InboxResponse | null>(null);
  const [dms, setDms] = useState<DmConv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      api<InboxResponse>("GET", "/api/inbox", undefined, token),
      api<{ conversations: DmConv[] }>("GET", "/api/dm/conversations", undefined, token).catch(() => ({ conversations: [] as DmConv[] })),
    ])
      .then(([inboxRes, dmRes]) => {
        if (cancelled) return;
        setData(inboxRes);
        setDms(dmRes.conversations);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "받은 메시지를 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function openDm(conversationId: string) {
    router.push(`/messages?dm=${encodeURIComponent(conversationId)}`);
  }

  // 미독 DM 우선
  const recentDms = [...dms]
    .sort((a, b) => {
      // 미독 카운트 우선, 다음 lastMessageAt 내림차순
      if ((b.unreadCount ?? 0) !== (a.unreadCount ?? 0)) return (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 8);
  const totalUnreadDm = dms.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/mypage" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← 마이페이지
          </Link>
          <p className="eyebrow">알림함</p>
          <h1 className="editorial-h2 text-white">받은 메시지·요청</h1>
          <p className="text-sm text-zinc-400">
            1:1 메시지, 협업 요청, 댓글·좋아요를 한 곳에서
          </p>
        </header>

        {/* 받은 DM (미독 우선) */}
        {recentDms.length > 0 ? (
          <section className="space-y-2 rounded-2xl border border-violet-400/25 bg-violet-500/[0.04] p-4">
            <header className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-violet-200">
                1:1 메시지
                {totalUnreadDm > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">
                    {totalUnreadDm}
                  </span>
                ) : null}
              </p>
              <p className="text-[0.65rem] text-zinc-500">최근 {recentDms.length}개</p>
            </header>
            <ul className="space-y-1.5">
              {recentDms.map((c) => {
                const peerName = c.peer.name || c.peer.email || c.peer.userCode || "사용자";
                const initial = peerName.trim()[0]?.toUpperCase() ?? "?";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openDm(c.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-left hover:border-violet-400/40 hover:bg-white/[0.05]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-violet-700/30 text-xs font-bold text-white">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-bold text-white">{peerName}</p>
                          {c.lastMessageAt ? (
                            <span className="shrink-0 text-[0.6rem] text-zinc-500">
                              {formatRelativeTime(c.lastMessageAt)}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-zinc-400">
                          {c.lastMessage?.content ?? "(메시지 없음)"}
                        </p>
                      </div>
                      {c.unreadCount > 0 ? (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[0.65rem] text-zinc-500">
              클릭하면 채팅창으로 바로 연결됩니다.
            </p>
          </section>
        ) : null}

        {/* 협업 요청 */}
        <CollabRequestsInbox />

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingState label="불러오는 중..." />
        ) : !data || data.total === 0 ? (
          <EmptyState
            title="아직 받은 응답이 없습니다"
            description="커뮤니티에 글을 올리면 여기에 응답이 모입니다."
            action={
              <Link href="/community/new" className="btn-primary text-sm">
                새 글 작성 →
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* 댓글 */}
            {data.comments.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-violet-300">
                  댓글 {data.comments.length}건
                </h2>
                <ul className="space-y-2">
                  {data.comments.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={c.post ? `/community/${c.post.id}` : "/community"}
                        className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-violet-400/40 hover:bg-white/[0.04]"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs text-zinc-500">
                            <span className="font-bold text-violet-200">
                              {c.author.name || c.author.email.split("@")[0]}
                            </span>
                            님이{" "}
                            <span className="text-zinc-300">
                              "{c.post?.title.slice(0, 30) ?? "글"}..."
                            </span>
                            에 댓글
                          </p>
                          <span className="shrink-0 text-[0.7rem] text-zinc-500">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-100">
                          {c.content}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 좋아요 */}
            {data.likes.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-rose-300">
                  좋아요 {data.likes.length}건
                </h2>
                <ul className="space-y-2">
                  {data.likes.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={l.post ? `/community/${l.post.id}` : "/community"}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-rose-400/40 hover:bg-white/[0.04]"
                      >
                        <p className="text-xs text-zinc-300">
                          <span className="font-bold text-rose-200">
                            {l.user.name || l.user.email.split("@")[0]}
                          </span>
                          님이{" "}
                          <span className="text-zinc-400">
                            "{l.post?.title.slice(0, 40) ?? "글"}..."
                          </span>
                          좋아함
                        </p>
                        <span className="shrink-0 text-[0.7rem] text-zinc-500">
                          {formatRelativeTime(l.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
