"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { planLabels, userTypeLabels } from "@/lib/product";

export default function Navbar({
  onMenuToggle,
}: {
  onMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[var(--navbar-height)] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {user ? (
            <button
              type="button"
              onClick={onMenuToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 lg:hidden"
              aria-label="메뉴 열기"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          ) : null}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              W
            </span>
            <span className="text-lg font-bold text-gray-900">Widea</span>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {user.isAdmin ? (
              <span className="badge badge-warning">Admin</span>
            ) : null}
            <span className="hidden rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">
              {planLabels[user.planType] || user.planType}
            </span>
            <span className="hidden rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 sm:inline-flex">
              {user.isAdmin ? "Unlimited" : `${user.creditBalance} credits`}
            </span>
            <div className="hidden min-w-[120px] text-right lg:block">
              <p className="text-sm font-semibold text-gray-900">{user.name || user.email}</p>
              <p className="text-xs text-gray-500">
                {user.userType ? userTypeLabels[user.userType] : "역할 선택 필요"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 md:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              시작하기
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
