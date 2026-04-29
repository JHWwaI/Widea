"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { planLabels, userTypeLabels } from "@/lib/product";

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout } = useAuth();

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
              <span
                className="hidden rounded-md px-2.5 py-1 text-xs font-semibold sm:inline-flex"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.22)", color: "#FCD34D" }}
              >
                Admin
              </span>
            )}
            <span
              className="hidden rounded-md px-2.5 py-1 text-xs font-semibold sm:inline-flex"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.22)", color: "#C4B5FD" }}
            >
              {planLabels[user.planType] || user.planType}
            </span>
            <span
              className="hidden rounded-md px-2.5 py-1 text-xs font-semibold sm:inline-flex"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#A8AACC" }}
            >
              {user.isAdmin ? "∞ cr" : `${user.creditBalance} cr`}
            </span>
            <Link
              href="/mypage"
              className="group hidden min-w-[120px] rounded-lg px-2 py-1 text-right transition-colors hover:bg-white/[0.04] lg:block"
              aria-label="내 정보 (마이페이지)"
              title="마이페이지로 이동"
            >
              <p className="text-sm font-semibold text-white group-hover:text-violet-200">
                {user.name || user.email}
              </p>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                {user.userType ? userTypeLabels[user.userType] : "역할 선택 필요"}
              </p>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#A8AACC",
              }}
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
