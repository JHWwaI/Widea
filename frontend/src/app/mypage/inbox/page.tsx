"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { communityCategoryOptions, formatRelativeTime, readError } from "@/lib/product";

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

type Tab = "all" | "comments" | "likes";

type PostGroup = {
  post: Post;
  commentCount: number;
  likeCount: number;
  latestAt: string;
  recentAuthors: string[];
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  communityCategoryOptions.map((o) => [o.value, o.label]),
);

export default function InboxPage() {
  const { token } = useAuth();
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<InboxResponse>("GET", "/api/inbox", undefined, token)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "인박스 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  // 게시글별로 응답 묶기
  const grouped = useMemo<PostGroup[]>(() => {
    if (!data) return [];
    const map = new Map<string, PostGroup>();
    const add = (post: Post | undefined, type: "c" | "l", at: string, displayName: string) => {
      if (!post) return;
      const existing = map.get(post.id);
      if (existing) {
        if (type === "c") existing.commentCount++;
        else existing.likeCount++;
        if (new Date(at) > new Date(existing.latestAt)) existing.latestAt = at;
        if (!existing.recentAuthors.includes(displayName)) {
          existing.recentAuthors.push(displayName);
        }
      } else {
        map.set(post.id, {
          post,
          commentCount: type === "c" ? 1 : 0,
          likeCount: type === "l" ? 1 : 0,
          latestAt: at,
          recentAuthors: [displayName],
        });
      }
    };
    for (const c of data.comments) {
      add(c.post, "c", c.createdAt, c.author.name || c.author.email.split("@")[0]);
    }
    for (const l of data.likes) {
      add(l.post, "l", l.createdAt, l.user.name || l.user.email.split("@")[0]);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
    );
  }, [data]);

  const totalComments = data?.comments.length ?? 0;
  const totalLikes = data?.likes.length ?? 0;

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
          <p className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-zinc-300">
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
          <>
            {/* 탭 */}
            <div className="flex items-center justify-between border-b border-white/[0.06]">
              <div className="flex items-center gap-1">
                <TabBtn
                  label={`게시글별 ${grouped.length}`}
                  active={tab === "all"}
                  onClick={() => setTab("all")}
                />
                <TabBtn
                  label={`댓글 ${totalComments}`}
                  active={tab === "comments"}
                  onClick={() => setTab("comments")}
                />
                <TabBtn
                  label={`좋아요 ${totalLikes}`}
                  active={tab === "likes"}
                  onClick={() => setTab("likes")}
                />
              </div>
              <p className="text-xs text-zinc-500">
                총 응답 <span className="font-semibold text-white">{totalComments + totalLikes}</span>건
              </p>
            </div>

            {/* 전체 — 게시글별 그룹 */}
            {tab === "all" ? (
              <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06]">
                {grouped.map((g) => (
                  <Link
                    key={g.post.id}
                    href={`/community/${g.post.id}`}
                    className="group flex gap-4 bg-zinc-950 p-5 transition-colors hover:bg-white/[0.025]"
                  >
                    {/* 좌측: 응답 카운트 큰 숫자 */}
                    <div className="flex shrink-0 flex-col items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 min-w-[64px]">
                      <span className="display-num text-2xl text-white">
                        {g.commentCount + g.likeCount}
                      </span>
                      <span className="text-[0.6rem] uppercase tracking-wider text-zinc-500">응답</span>
                    </div>

                    {/* 본문 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-zinc-300">
                          {CATEGORY_LABEL[g.post.category] || g.post.category}
                        </span>
                        <span className="shrink-0 text-[0.7rem] text-zinc-500">
                          {formatRelativeTime(g.latestAt)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-white">
                        {g.post.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {g.commentCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.025] px-2 py-0.5 font-medium text-zinc-200">
                            <span className="text-zinc-500">💬</span> {g.commentCount}
                          </span>
                        ) : null}
                        {g.likeCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.025] px-2 py-0.5 font-medium text-zinc-200">
                            <span className="text-zinc-500">♡</span> {g.likeCount}
                          </span>
                        ) : null}
                        <span className="truncate text-zinc-500">
                          {g.recentAuthors.slice(0, 3).join(", ")}
                          {g.recentAuthors.length > 3 ? ` 외 ${g.recentAuthors.length - 3}명` : ""}
                        </span>
                      </div>
                    </div>

                    <span className="self-center text-zinc-600 group-hover:text-white">→</span>
                  </Link>
                ))}
              </div>
            ) : null}

            {/* 댓글 — 작성자 이니셜 + 큰 본문 */}
            {tab === "comments" ? (
              data.comments.length === 0 ? (
                <EmptyState title="댓글이 없습니다" description="" />
              ) : (
                <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06]">
                  {data.comments.map((c) => {
                    const name = c.author.name || c.author.email.split("@")[0];
                    return (
                      <Link
                        key={c.id}
                        href={c.post ? `/community/${c.post.id}` : "/community"}
                        className="flex gap-3 bg-zinc-950 p-5 transition-colors hover:bg-white/[0.025]"
                      >
                        <Avatar name={name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-xs text-zinc-400">
                              <span className="font-semibold text-white">{name}</span>
                              <span className="ml-1.5 text-zinc-500">
                                {CATEGORY_LABEL[c.post?.category ?? ""] ?? ""}
                              </span>
                            </p>
                            <span className="shrink-0 text-[0.7rem] text-zinc-500">
                              {formatRelativeTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-300">
                            ↳ {c.post?.title}
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-100">
                            {c.content}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : null}

            {/* 좋아요 — 카드 그리드 */}
            {tab === "likes" ? (
              data.likes.length === 0 ? (
                <EmptyState title="좋아요가 없습니다" description="" />
              ) : (
                <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06]">
                  {data.likes.map((l) => {
                    const name = l.user.name || l.user.email.split("@")[0];
                    return (
                      <Link
                        key={l.id}
                        href={l.post ? `/community/${l.post.id}` : "/community"}
                        className="flex items-center gap-3 bg-zinc-950 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                      >
                        <Avatar name={name} small />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-zinc-200">
                            <span className="font-semibold text-white">{name}</span>
                            <span className="text-zinc-500"> · </span>
                            <span className="truncate text-zinc-400">
                              {l.post?.title}
                            </span>
                          </p>
                        </div>
                        <span className="shrink-0 text-[0.7rem] text-zinc-500">
                          {formatRelativeTime(l.createdAt)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : null}
          </>
        )}
      </div>
    </AuthGuard>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
      {active ? (
        <span className="absolute bottom-[-1px] left-0 right-0 h-px bg-white" />
      ) : null}
    </button>
  );
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  const size = small ? "h-7 w-7 text-[0.7rem]" : "h-9 w-9 text-sm";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-semibold text-zinc-300 ${size}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
