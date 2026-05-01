"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { communityCategoryOptions, formatRelativeTime, readError } from "@/lib/product";

type Post = { id: string; title: string; category: string };

type Item =
  | {
      type: "post";
      id: string;
      at: string;
      post: Post;
      meta: { viewCount: number; comments: number; likes: number };
    }
  | { type: "comment"; id: string; at: string; post: Post; content: string }
  | { type: "like"; id: string; at: string; post: Post };

type Counts = { posts: number; comments: number; likes: number };

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  communityCategoryOptions.map((o) => [o.value, o.label]),
);

const TYPE_LABEL: Record<Item["type"], string> = {
  post: "내가 쓴 글",
  comment: "내가 단 댓글",
  like: "내가 누른 좋아요",
};

type Tab = "all" | "post" | "comment" | "like";

export default function ActivityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Counts>({ posts: 0, comments: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ items: Item[]; counts: Counts }>("GET", "/api/activity?limit=50", undefined, token)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setCounts(res.counts);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "활동 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const filtered = tab === "all" ? items : items.filter((i) => i.type === tab);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl space-y-6 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/mypage" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← 마이페이지
          </Link>
          <p className="eyebrow">활동</p>
          <h1 className="editorial-h2 text-white">내 활동</h1>
          <p className="text-sm text-zinc-400">
            내가 쓴 글·단 댓글·누른 좋아요를 시간순으로 보여줍니다.
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-zinc-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingState label="불러오는 중..." />
        ) : items.length === 0 ? (
          <EmptyState
            title="아직 활동이 없습니다"
            description="커뮤니티에 글을 쓰거나 댓글·좋아요를 남기면 여기에 모입니다."
            action={
              <Link href="/community" className="btn-primary text-sm">
                커뮤니티 둘러보기 →
              </Link>
            }
          />
        ) : (
          <>
            {/* 탭 */}
            <div className="flex items-center gap-1 border-b border-white/[0.06]">
              <TabBtn label={`전체 ${items.length}`} active={tab === "all"} onClick={() => setTab("all")} />
              <TabBtn label={`글 ${counts.posts}`} active={tab === "post"} onClick={() => setTab("post")} />
              <TabBtn label={`댓글 ${counts.comments}`} active={tab === "comment"} onClick={() => setTab("comment")} />
              <TabBtn label={`좋아요 ${counts.likes}`} active={tab === "like"} onClick={() => setTab("like")} />
            </div>

            {filtered.length === 0 ? (
              <EmptyState title="해당 활동이 없습니다" description="" />
            ) : (
              <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06]">
                {filtered.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={`/community/${item.post.id}`}
                    className="group flex gap-4 bg-zinc-950 p-5 transition-colors hover:bg-white/[0.025]"
                  >
                    <span className="shrink-0 self-start rounded-md border border-white/10 bg-white/[0.025] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-300">
                      {TYPE_LABEL[item.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
                          {CATEGORY_LABEL[item.post.category] || item.post.category}
                        </p>
                        <span className="shrink-0 text-[0.7rem] text-zinc-500">
                          {formatRelativeTime(item.at)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {item.post.title}
                      </p>
                      {item.type === "comment" ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-200">
                          {item.content}
                        </p>
                      ) : null}
                      {item.type === "post" ? (
                        <p className="mt-2 text-xs text-zinc-400">
                          조회 {item.meta.viewCount} · 댓글 {item.meta.comments} · 좋아요 {item.meta.likes}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
      {active ? <span className="absolute bottom-[-1px] left-0 right-0 h-px bg-white" /> : null}
    </button>
  );
}
