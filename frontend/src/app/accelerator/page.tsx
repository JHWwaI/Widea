"use client";

import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { communityCategoryOptions, formatDate, readError, userTypeLabels } from "@/lib/product";
import type { CommunityListResponse, CommunityPost } from "@/lib/types";
import { useEffect, useState } from "react";

export default function AcceleratorPage() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || user?.userType !== "ACCELERATOR") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api<CommunityListResponse>("GET", buildQuery("/api/ac/founders", { page: 1, limit: 12 }), undefined, token)
      .then((response) => {
        if (!cancelled) setPosts(response.posts);
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "파이프라인 글을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, user?.userType]);

  async function handleBookmark(postId: string) {
    if (!token) return;

    try {
      const response = await api<{ bookmarked: boolean }>(
        "POST",
        `/api/ac/bookmarks/${postId}`,
        {},
        token,
      );

      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, bookmarked: response.bookmarked } : post,
        ),
      );
    } catch (caught) {
      setError(readError(caught, "북마크 처리에 실패했습니다."));
    }
  }

  const bookmarkedCount = posts.filter((post) => post.bookmarked).length;

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="액셀러레이터 파이프라인"
          title="유망 팀 발굴 보드"
          description="커뮤니티에서 팀 모집과 아이디어 공유 글을 모아 액셀러레이터 전용 파이프라인처럼 관리할 수 있습니다."
          badge={user?.userType ? <span className="badge badge-accent">{userTypeLabels[user.userType]}</span> : undefined}
        />

        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">
            {error}
          </Surface>
        ) : null}

        {user?.userType !== "ACCELERATOR" ? (
          <Surface className="space-y-5">
            <EmptyState
              title="이 화면은 액셀러레이터 역할에 최적화되어 있습니다"
              description="현재 계정 역할이 액셀러레이터가 아니면 발굴 전용 API 대신 커뮤니티와 프로젝트 워크플로를 먼저 사용하는 편이 좋습니다."
            />
          </Surface>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Surface className="space-y-2">
                <p className="eyebrow">후보 팀</p>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-gray-900">{posts.length}</p>
                <p className="text-sm text-gray-500">발굴 후보 글 수</p>
              </Surface>
              <Surface className="space-y-2 surface-card-accent">
                <p className="eyebrow">북마크</p>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-gray-900">{bookmarkedCount}</p>
                <p className="text-sm text-gray-500">후속 검토용 저장 글 수</p>
              </Surface>
              <Surface className="space-y-2">
                <p className="eyebrow">파이프라인 신호</p>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-gray-900">
                  {posts.filter((post) => post.category === "TEAM_RECRUIT").length}
                </p>
                <p className="text-sm text-gray-500">직접 팀 모집 중인 글</p>
              </Surface>
            </div>

            {loading ? (
              <EmptyState
                title="발굴 파이프라인을 불러오는 중입니다"
                description="TEAM_RECRUIT와 IDEA_SHARE 중심으로 글을 모으고 있습니다."
              />
            ) : posts.length === 0 ? (
              <EmptyState
                title="아직 후보 글이 없습니다"
                description="커뮤니티에 팀 모집이나 아이디어 공유 글이 쌓이면 이곳에서 후보를 빠르게 스캔할 수 있습니다."
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {posts.map((post) => (
                  <Surface key={post.id} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="badge badge-accent">
                          {communityCategoryOptions.find((option) => option.value === post.category)?.label ||
                            post.category}
                        </span>
                        <h2 className="mt-3 text-xl font-semibold text-gray-900">
                          {post.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBookmark(post.id)}
                        className={post.bookmarked ? "btn-secondary px-4 py-2 text-sm" : "btn-ghost px-4 py-2 text-sm"}
                      >
                        {post.bookmarked ? "북마크됨" : "북마크"}
                      </button>
                    </div>
                    <p className="text-sm leading-7 text-gray-500">{post.content}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>{post.author?.name || post.author?.email || "익명"}</span>
                      <span>{formatDate(post.createdAt)}</span>
                      <span>댓글 {post._count?.comments || 0}</span>
                      <span>좋아요 {post._count?.likes || 0}</span>
                    </div>
                  </Surface>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
