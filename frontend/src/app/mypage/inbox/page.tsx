"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";

type Author = { id: string; name: string | null; email: string };
type Post = { id: string; title: string; category: string };

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
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<InboxResponse>("GET", "/api/inbox", undefined, token)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "인박스 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/mypage" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← 마이페이지
          </Link>
          <p className="eyebrow">인박스</p>
          <h1 className="editorial-h2 text-white">최근 받은 응답</h1>
          <p className="text-sm text-zinc-400">
            내 게시글에 달린 댓글·좋아요 (최근 30일)
          </p>
        </header>

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
                  💬 댓글 {data.comments.length}건
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
                  ❤ 좋아요 {data.likes.length}건
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
