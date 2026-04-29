"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import {
  clampText,
  communityCategoryOptions,
  formatDate,
  readError,
} from "@/lib/product";
import type { CommunityListResponse, CommunityPost } from "@/lib/types";

const PAGE_SIZE = 20;

export default function CommunityPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);

    api<CommunityListResponse>(
      "GET",
      buildQuery("/api/community/posts", { category, page: 1, limit: PAGE_SIZE }),
      undefined,
      token ?? undefined,
    )
      .then((response) => {
        if (!cancelled) {
          setPosts(response.posts);
          setTotalPages(response.totalPages ?? 1);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "커뮤니티 글을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [category, token]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const response = await api<CommunityListResponse>(
        "GET",
        buildQuery("/api/community/posts", { category, page: nextPage, limit: PAGE_SIZE }),
        undefined,
        token ?? undefined,
      );
      setPosts((prev) => [...prev, ...response.posts]);
      setPage(nextPage);
      setTotalPages(response.totalPages ?? 1);
    } catch (caught) {
      setError(readError(caught, "추가 글을 불러오지 못했습니다."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLike(postId: string) {
    if (!token) return;
    try {
      const response = await api<{ liked: boolean; likeCount: number }>(
        "POST",
        `/api/community/posts/${postId}/like`,
        {},
        token,
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, _count: { comments: post._count?.comments || 0, likes: response.likeCount } }
            : post,
        ),
      );
    } catch (caught) {
      setError(readError(caught, "좋아요 처리에 실패했습니다."));
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="커뮤니티"
          title="커뮤니티"
          description="아이디어 공유, 질문, 팀 모집까지 한곳에서 연결합니다."
          actions={
            token ? (
              <Link href="/community/new" className="btn-primary px-5 py-2.5 text-sm">
                새 글 작성
              </Link>
            ) : undefined
          }
        />

        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">{error}</Surface>
        ) : null}

        <Surface className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={category === "" ? "btn-secondary px-4 py-2 text-sm" : "btn-ghost px-4 py-2 text-sm"}
            >
              전체
            </button>
            {communityCategoryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={
                  category === option.value
                    ? "btn-secondary px-4 py-2 text-sm"
                    : "btn-ghost px-4 py-2 text-sm"
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <EmptyState
              title="게시글을 불러오는 중입니다"
              description="카테고리별 최신 흐름을 연결하고 있습니다."
            />
          ) : posts.length === 0 ? (
            <EmptyState
              title="아직 게시글이 없습니다"
              description="첫 번째 글을 작성해 시장 인사이트나 팀 모집 글을 남겨보세요."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {posts.map((post) => (
                <div key={post.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-accent">
                          {communityCategoryOptions.find((o) => o.value === post.category)?.label || post.category}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
                      </div>
                      <Link href={`/community/${post.id}`}>
                        <h3 className="text-lg font-semibold text-white hover:text-violet-200">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="text-sm leading-6 text-zinc-400">
                        {clampText(post.content, 160)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span>{post.author?.name || post.author?.email || "익명"}</span>
                        <span>조회 {post.viewCount}</span>
                        <span>댓글 {post._count?.comments || 0}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className="btn-ghost px-3 py-1.5 text-sm"
                      >
                        ♡ {post._count?.likes || 0}
                      </button>
                      <Link href={`/community/${post.id}`} className="text-xs text-blue-500 hover:underline">
                        읽기 →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && page < totalPages && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary px-6 py-2.5 text-sm"
              >
                {loadingMore ? "불러오는 중..." : "더보기"}
              </button>
            </div>
          )}
        </Surface>
      </div>
    </AuthGuard>
  );
}
