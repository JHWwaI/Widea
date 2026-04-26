"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState, PageHeader, StatCard, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { formatRelativeTime, planLabels, readError, userTypeLabels, userTypeOptions } from "@/lib/product";
import type { IdeaMatchSessionListResponse } from "@/lib/types";

interface MyIdea {
  id: string;
  titleKo: string;
  oneLinerKo?: string | null;
  status: string;
  marketFitScore?: number | null;
  sessionProjectTitle?: string;
  updatedAt?: string;
}

export default function MyPage() {
  const { token, user, setUserType, refreshUser } = useAuth();
  const [myIdeas, setMyIdeas] = useState<MyIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleChanging, setRoleChanging] = useState(false);
  const [roleMsg, setRoleMsg] = useState("");

  const [profileForm, setProfileForm] = useState({ name: "", currentPassword: "", newPassword: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: "", ok: true });

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true);
    setProfileMsg({ text: "", ok: true });
    try {
      const body: Record<string, string> = {};
      if (profileForm.name.trim()) body.name = profileForm.name.trim();
      if (profileForm.newPassword) {
        body.currentPassword = profileForm.currentPassword;
        body.newPassword = profileForm.newPassword;
      }
      await api("PATCH", "/api/auth/me", body, token);
      await refreshUser();
      setProfileMsg({ text: "저장됐습니다.", ok: true });
      setProfileForm({ name: "", currentPassword: "", newPassword: "" });
    } catch (caught) {
      setProfileMsg({ text: readError(caught, "저장에 실패했습니다."), ok: false });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleRoleChange(newType: string) {
    if (!token || newType === user?.userType) return;
    setRoleChanging(true);
    setRoleMsg("");
    try {
      await setUserType(newType);
      setRoleMsg("역할이 변경되었습니다.");
    } catch {
      setRoleMsg("역할 변경에 실패했습니다.");
    } finally {
      setRoleChanging(false);
    }
  }

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    api<IdeaMatchSessionListResponse>(
      "GET",
      buildQuery("/api/idea-match/sessions", { limit: 20 }),
      undefined,
      token,
    )
      .then((sessionData) => {
        if (cancelled) return;
        const ideas: MyIdea[] = [];
        for (const session of sessionData.sessions) {
          if (session.generatedIdeas) {
            for (const idea of session.generatedIdeas) {
              if (idea.status === "SELECTED" || idea.status === "SHORTLISTED") {
                ideas.push({
                  id: idea.id,
                  titleKo: idea.titleKo,
                  oneLinerKo: idea.oneLinerKo,
                  status: idea.status,
                  marketFitScore: idea.marketFitScore,
                  sessionProjectTitle: session.projectPolicy?.title,
                  updatedAt: idea.updatedAt,
                });
              }
            }
          }
        }
        setMyIdeas(ideas);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(readError(caught, "데이터를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthGuard>
      <div className="space-y-6 fade-up">
        <PageHeader
          eyebrow="My workspace"
          title={`안녕하세요${user?.name ? `, ${user.name}` : ""}`}
          description="계정 현황과 선정한 아이디어를 확인하세요."
          badge={
            user ? (
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {user.userType ? userTypeLabels[user.userType] : "역할 미설정"}
              </span>
            ) : undefined
          }
          actions={
            <Link href="/idea-match" className="btn-primary">
              새 아이디어 탐색
            </Link>
          }
        />

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Current plan"
            value={user ? planLabels[user.planType] || user.planType : "-"}
            hint="현재 구독 플랜"
            tone="accent"
          />
          <StatCard
            label="Credit balance"
            value={user?.isAdmin ? "Unlimited" : user?.creditBalance ?? 0}
            hint="AI 실행 시 크레딧 차감"
          />
          <StatCard
            label="내 아이디어"
            value={myIdeas.length}
            hint="선정/숏리스트 아이디어"
            tone="warm"
          />
        </div>

        {/* 내 아이디어 + 계정 정보 */}
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Surface className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">My ideas</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">내 아이디어</h2>
              </div>
              <Link href="/idea-match" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Idea Match 열기
              </Link>
            </div>

            {loading ? (
              <LoadingState label="아이디어를 불러오는 중..." />
            ) : myIdeas.length === 0 ? (
              <EmptyState
                title="선정한 아이디어가 없습니다"
                description="Idea Match에서 아이디어를 탐색하고 마음에 드는 것을 선정하면 여기에 나타납니다."
                action={
                  <Link href="/idea-match" className="btn-primary text-sm">
                    아이디어 탐색하기
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-2">
                {myIdeas.map((idea) => (
                  <Link
                    key={idea.id}
                    href={`/ideas/${idea.id}`}
                    className="group rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                          {idea.titleKo}
                        </p>
                        {idea.oneLinerKo ? (
                          <p className="mt-1 text-xs text-gray-500">{idea.oneLinerKo}</p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {idea.sessionProjectTitle ? (
                            <span className="text-xs text-gray-400">
                              프로젝트: {idea.sessionProjectTitle}
                            </span>
                          ) : null}
                          {idea.updatedAt ? (
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(idea.updatedAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {idea.marketFitScore != null ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Fit {(idea.marketFitScore / 10).toFixed(1)}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            idea.status === "SELECTED"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {idea.status === "SELECTED" ? "Selected" : "Shortlisted"}
                        </span>
                        <svg className="h-4 w-4 text-gray-300 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Surface>

          <div className="space-y-4">
            {/* 계정 정보 */}
            <Surface className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Profile</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">계정 정보</h2>
              </div>
              <dl className="grid gap-2">
                {[
                  ["이름", user?.name || "-"],
                  ["이메일", user?.email || "-"],
                  ["플랜", user ? planLabels[user.planType] || user.planType : "-"],
                  ["크레딧", user?.isAdmin ? "Unlimited" : `${user?.creditBalance ?? 0} cr`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                  >
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-semibold text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Surface>

            {/* 프로필 수정 */}
            <Surface className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Edit profile</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">프로필 수정</h2>
              </div>
              {profileMsg.text ? (
                <p className={`text-sm font-medium ${profileMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {profileMsg.text}
                </p>
              ) : null}
              <form onSubmit={handleProfileSave} className="space-y-3">
                <div>
                  <label className="field-label">이름 변경</label>
                  <input
                    className="input"
                    placeholder={user?.name || "이름 입력"}
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">현재 비밀번호</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="비밀번호 변경 시 입력"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">새 비밀번호</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="8자 이상, 영문+숫자"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm((p) => ({ ...p, newPassword: e.target.value }))}
                  />
                </div>
                <button type="submit" disabled={profileSaving} className="btn-primary w-full">
                  {profileSaving ? "저장 중..." : "저장"}
                </button>
              </form>
            </Surface>

            {/* 역할 변경 */}
            <Surface className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Role</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">내 역할</h2>
                <p className="mt-1 text-sm text-gray-500">역할에 따라 제공되는 기능이 달라집니다.</p>
              </div>
              {roleMsg ? (
                <p className={`text-sm font-medium ${roleMsg.includes("실패") ? "text-red-600" : "text-emerald-600"}`}>
                  {roleMsg}
                </p>
              ) : null}
              <div className="grid gap-2">
                {userTypeOptions.map((opt) => {
                  const isActive = user?.userType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={roleChanging || isActive}
                      onClick={() => handleRoleChange(opt.value)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        isActive
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? "text-blue-700" : "text-gray-900"}`}>
                          {opt.label}
                        </p>
                        {opt.hint ? (
                          <p className="mt-0.5 text-xs text-gray-500">{opt.hint}</p>
                        ) : null}
                      </div>
                      {isActive ? (
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">현재</span>
                      ) : (
                        <span className={`text-xs text-gray-400 ${roleChanging ? "" : "group-hover:text-blue-500"}`}>
                          {roleChanging ? "변경 중..." : "선택"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Surface>

            {/* 빠른 링크 */}
            <Surface className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Quick links</p>
              <div className="grid gap-2">
                <Link
                  href="/projects"
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>내 프로젝트</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/billing"
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>결제 및 크레딧</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>플랜 업그레이드</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </Surface>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
