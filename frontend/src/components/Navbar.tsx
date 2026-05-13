"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { planLabels, userTypeLabels } from "@/lib/product";
import { subscribeWS } from "@/lib/ws";

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // 알림 미독 카운트 — 댓글/좋아요(인박스) + DM 미독 합산. 60초 폴링.
  useEffect(() => {
    if (!token) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    async function fetchUnread() {
      try {
        const [a, b] = await Promise.all([
          api<{ count: number }>("GET", "/api/inbox/count", undefined, token).catch(() => ({ count: 0 })),
          api<{ unreadTotal: number }>("GET", "/api/dm/unread-summary", undefined, token).catch(() => ({ unreadTotal: 0 })),
        ]);
        if (!cancelled) setUnread((a.count ?? 0) + (b.unreadTotal ?? 0));
      } catch {
        /* silent */
      }
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 60_000);
    // 실시간: 협업요청·DM 도착 즉시 카운트 +1
    const unsub = subscribeWS("notification.new", () => {
      setUnread((u) => u + 1);
    });
    return () => {
      cancelled = true;
      clearInterval(t);
      unsub();
    };
  }, [token, pathname]);

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

          <Link href={user ? "/idea-match" : "/"} className="flex items-center">
            <span className="text-lg font-bold tracking-tight text-white">Widea</span>
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
              className="hidden rounded-md px-2.5 py-1 text-xs font-medium sm:inline-flex"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ink-3)" }}
            >
              {planLabels[user.planType] || user.planType}
            </span>
            <span
              className="hidden rounded-md px-2.5 py-1 text-xs font-semibold sm:inline-flex"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#A8AACC" }}
            >
              {user.isAdmin ? "∞ cr" : `${user.creditBalance} cr`}
            </span>
            {/* 알림함 종 — 모든 페이지에서 상시 노출, 미독 카운트 배지 */}
            <Link
              href="/mypage/inbox"
              aria-label={unread > 0 ? `알림함 (미독 ${unread}개)` : "알림함"}
              title={unread > 0 ? `미독 ${unread}개` : "받은 메시지·요청"}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </Link>

            <Link
              href="/mypage"
              className="group hidden min-w-[120px] rounded-lg px-2 py-1 text-right transition-colors hover:bg-white/[0.04] lg:block"
              aria-label="내 정보 (마이페이지)"
              title="마이페이지로 이동"
            >
              <p className="text-sm font-medium text-white group-hover:text-zinc-300">
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
