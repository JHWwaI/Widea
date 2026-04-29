"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  communityCategoryOptions,
  formatDate,
  readError,
} from "@/lib/product";
import type { CommunityPostDetail, PostComment } from "@/lib/types";

export default function CommunityPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    api<CommunityPostDetail>("GET", `/api/community/posts/${id}`, undefined, token ?? undefined)
      .then((data) => {
        if (!cancelled) {
          setPost(data);
          setLikeCount(data._count?.likes ?? 0);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "게시글을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, token]);

  async function handleLike() {
    if (!token || !post) return;
    try {
      const response = await api<{ liked: boolean; likeCount: number }>(
        "POST",
        `/api/community/posts/${post.id}/like`,
        {},
        token,
      );
      setLikeCount(response.likeCount);
    } catch (caught) {
      setError(readError(caught, "좋아요 처리에 실패했습니다."));
    }
  }

  async function handleAddComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !post || !commentContent.trim()) return;
    setSubmittingComment(true);
    setError("");

    try {
      const comment = await api<PostComment>(
        "POST",
        `/api/community/posts/${post.id}/comments`,
        { content: commentContent.trim() },
        token,
      );
      setPost((current) =>
        current ? { ...current, comments: [...current.comments, comment] } : current,
      );
      setCommentContent("");
    } catch (caught) {
      setError(readError(caught, "댓글 작성에 실패했습니다."));
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token || !post) return;
    setDeletingId(commentId);
    try {
      await api("DELETE", `/api/community/posts/${post.id}/comments/${commentId}`, undefined, token);
      setPost((current) =>
        current
          ? { ...current, comments: current.comments.filter((c) => c.id !== commentId) }
          : current,
      );
    } catch (caught) {
      setError(readError(caught, "댓글 삭제에 실패했습니다."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeletePost() {
    if (!token || !post) return;
    const confirmed = window.confirm("게시글을 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      await api("DELETE", `/api/community/posts/${post.id}`, undefined, token);
      router.push("/community");
    } catch (caught) {
      setError(readError(caught, "게시글 삭제에 실패했습니다."));
    }
  }

  const categoryLabel =
    communityCategoryOptions.find((opt) => opt.value === post?.category)?.label ?? post?.category ?? "";

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/community" className="hover:text-gray-600">
            커뮤니티
          </Link>
          <span>/</span>
          <span className="text-gray-600">{categoryLabel}</span>
        </div>

        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">{error}</Surface>
        ) : null}

        {loading ? (
          <EmptyState
            title="게시글을 불러오는 중입니다"
            description="잠시만 기다려 주세요."
          />
        ) : !post ? (
          <EmptyState
            title="게시글을 찾을 수 없습니다"
            description="삭제됐거나 존재하지 않는 게시글입니다."
          />
        ) : (
          <>
            <Surface className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <span className="badge badge-accent">{categoryLabel}</span>
                  <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    {post.title}
                  </h1>
                </div>
                {user?.id === post.author?.id ? (
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="btn-ghost px-4 py-2 text-sm text-red-500"
                  >
                    삭제
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                <span>{post.author?.name || post.author?.email || "익명"}</span>
                <span>{formatDate(post.createdAt)}</span>
                <span>조회 {post.viewCount}</span>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {post.content}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLike}
                  className="btn-secondary px-5 py-2 text-sm"
                >
                  좋아요 {likeCount}
                </button>
              </div>
            </Surface>

            <Surface className="space-y-5">
              <div>
                <p className="eyebrow">댓글</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  댓글 {post.comments.length}개
                </h2>
              </div>

              {post.comments.length === 0 ? (
                <p className="text-sm text-gray-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start justify-between gap-3 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-medium text-gray-600">
                            {comment.author?.name || comment.author?.email || "익명"}
                          </span>
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-6 text-gray-700">{comment.content}</p>
                      </div>
                      {token && user?.id === comment.author?.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingId === comment.id}
                          className="btn-ghost shrink-0 px-3 py-1 text-xs text-red-400"
                        >
                          {deletingId === comment.id ? "..." : "삭제"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {token ? (
                <form onSubmit={handleAddComment} className="grid gap-3 border-t border-gray-100 pt-5">
                  <label htmlFor="comment" className="field-label">
                    댓글 작성
                  </label>
                  <textarea
                    id="comment"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="textarea"
                    placeholder="댓글을 입력하세요."
                    rows={3}
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentContent.trim()}
                    className="btn-primary w-full"
                  >
                    {submittingComment ? "등록 중..." : "댓글 등록"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-gray-400">
                  댓글을 작성하려면{" "}
                  <Link href="/login" className="text-blue-600 underline">
                    로그인
                  </Link>
                  이 필요합니다.
                </p>
              )}
            </Surface>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
