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
  const [sidebarOpen, setSidebarOpen] = useState(false);      // mobile drawer
  const [sidebarVisible, setSidebarVisible] = useState(false); // desktop: hidden by default

  // 페이지 이동 시 모바일 drawer 닫기 (데스크탑 상태는 유지)
  useEffect(() => {
    setSidebarOpen(false);
    setSidebarVisible(false); // 페이지 이동 시 사이드바 닫힘
  }, [pathname]);

  const isPublicPage = PUBLIC_ROUTES.includes(pathname);

  if (isPublicPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
          <span className="text-sm text-gray-500">Widea 워크스페이스를 불러오는 중입니다...</span>
        </div>
      </div>
    );
  }

  const handleMenuToggle = user
    ? () => {
        // 모바일: drawer 토글 / 데스크탑: sidebarVisible 토글
        if (window.innerWidth < 1024) {
          setSidebarOpen((v) => !v);
        } else {
          setSidebarVisible((v) => !v);
        }
      }
    : undefined;

  const handleNavClick = () => {
    setSidebarOpen(false);
    setSidebarVisible(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar onMenuToggle={handleMenuToggle} />
      {user ? (
        <Sidebar
          open={sidebarOpen}
          visible={sidebarVisible}
          onClose={handleNavClick}
        />
      ) : null}
      <main
        className={[
          "px-4 pb-12 pt-[calc(var(--navbar-height)+1.25rem)] sm:px-6",
          user && sidebarVisible
            ? "lg:pl-[calc(var(--sidebar-width)+2rem)] lg:pr-8 transition-[padding] duration-300"
            : "lg:px-8 transition-[padding] duration-300",
        ].join(" ")}
      >
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
