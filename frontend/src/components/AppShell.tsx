"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/select-type", "/billing/success", "/billing/fail"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 데스크탑(≥1024px)에서는 기본 노출, 모바일은 닫힘
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    // 모바일 오버레이만 페이지 이동 시 닫기
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    // 사이드바 자동 토글 X — 사용자가 햄버거 메뉴로만 직접 토글
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("widea_sidebar_visible");
    if (saved !== null) setSidebarVisible(saved === "1");
  }, []);

  const isPublicPage = PUBLIC_ROUTES.includes(pathname);

  if (isPublicPage) return <>{children}</>;

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="flex items-center gap-3 rounded-2xl px-6 py-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          <span
            className="inline-flex h-2 w-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #6366F1)",
              animation: "pulse-glow 1.5s ease infinite",
            }}
          />
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            Widea 워크스페이스를 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  const handleMenuToggle = user
    ? () => {
        if (window.innerWidth < 1024) {
          setSidebarOpen((v) => !v);
        } else {
          setSidebarVisible((v) => {
            const next = !v;
            localStorage.setItem("widea_sidebar_visible", next ? "1" : "0");
            return next;
          });
        }
      }
    : undefined;

  const handleNavClick = () => {
    setSidebarOpen(false);
    setSidebarVisible(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar onMenuToggle={handleMenuToggle} />
      {user ? (
        <Sidebar open={sidebarOpen} visible={sidebarVisible} onClose={handleNavClick} />
      ) : null}
      <main
        className={[
          "px-4 pb-12 pt-[calc(var(--navbar-height)+1.25rem)] sm:px-6",
          user && sidebarVisible
            ? "lg:pl-[calc(var(--sidebar-width)+1rem)] lg:pr-4 transition-[padding] duration-300"
            : "lg:px-8 transition-[padding] duration-300",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-[1080px]">{children}</div>
      </main>
    </div>
  );
}
