"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { planLabels, userTypeLabels } from "@/lib/product";

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout, token } = useAuth();
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ count: number }>("GET", "/api/inbox/count", undefined, token)
      .then((res) => { if (!cancelled) setInboxCount(res.count); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        background: "rgba(7,6,15,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="mx-auto flex h-[var(--navbar-height)] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        {/* Left: menu + logo */}
        <div className="flex items-center gap-3">
          {user ? (
            <button
              type="button"
              onClick={onMenuToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#A8AACC",
              }}
              aria-label="메뉴 열기"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                <line x1="9" y1="4" x2="9" y2="20" />
              </svg>
            </button>
          ) : null}

          <Link href={user ? "/idea-match" : "/"} className="flex items-center gap-2.5">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #6366F1)",
                boxShadow: "0 2px 12px rgba(124,58,237,0.35)",
              }}
            >
              W
            </span>
            <span className="text-base font-bold text-white">Widea</span>
          </Link>
        </div>

        {/* Right */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {user.isAdmin && (
              <span className="hidden rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-zinc-300 sm:inline-flex">
                Admin
              </span>
            )}
            <span className="hidden rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-zinc-300 sm:inline-flex">
              {planLabels[user.planType] || user.planType}
            </span>
            <span className="hidden rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-zinc-300 sm:inline-flex">
              {user.isAdmin ? "∞ cr" : `${user.creditBalance} cr`}
            </span>

            {/* 알림 종 — 인박스로 이동 */}
            <Link
              href="/mypage/inbox"
              aria-label={`알림${inboxCount > 0 ? ` ${inboxCount}건` : ""}`}
              title="알림"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {inboxCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
              ) : null}
            </Link>

            <Link
              href="/mypage"
              className="group hidden min-w-[120px] rounded-md px-2 py-1 text-right transition-colors hover:bg-white/[0.04] lg:block"
              aria-label="내 정보 (마이페이지)"
              title="마이페이지로 이동"
            >
              <p className="text-sm font-semibold text-white">
                {user.name || user.email}
              </p>
              <p className="text-xs text-zinc-500">
                {user.userType ? userTypeLabels[user.userType] : "역할 선택 필요"}
              </p>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden px-3 py-1.5 text-sm font-medium transition-colors md:inline-flex"
              style={{ color: "var(--ink-3)" }}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ color: "#A8AACC" }}
            >
              로그인
            </Link>
            <Link href="/register" className="btn-primary px-4 py-1.5 text-sm">
              시작하기
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
