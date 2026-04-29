"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type NavItem = { href: string; label: string; icon: string };
type NavSection = { title: string; items: NavItem[] };

function getNavSections(): NavSection[] {
  const community: NavSection = {
    title: "커뮤니티",
    items: [
      { href: "/community", label: "커뮤니티", icon: "users" },
      { href: "/talent", label: "전문가 찾기", icon: "user" },
      { href: "/collab/meet", label: "실시간 회의", icon: "chat" },
    ],
  };

  const support: NavSection = {
    title: "고객 지원",
    items: [{ href: "/contact", label: "문의하기", icon: "chat" }],
  };

  // 모든 역할 공통: 메인은 마이페이지·아이디어, 협업은 커뮤니티·회의로 통합
  return [
    {
      title: "메인",
      items: [
        { href: "/idea-match", label: "아이디어 만들기", icon: "sparkle" },
        { href: "/mypage", label: "내 아이디어", icon: "user" },
        { href: "/projects", label: "프로젝트", icon: "folder" },
      ],
    },
    {
      title: "결제",
      items: [{ href: "/billing", label: "구독·결제", icon: "credit" }],
    },
    community,
    support,
  ];
}

const icons: Record<string, React.ReactNode> = {
  search: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  folder: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  ),
  ledger: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </svg>
  ),
  sparkle: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  user: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  credit: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  ),
  chat: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  ),
  admin: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  ),
};

export default function Sidebar({
  open,
  visible,
  onClose,
}: {
  open: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="사이드바 닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      />

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed bottom-0 left-0 top-[var(--navbar-height)] z-40 w-[var(--sidebar-width)]",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          visible ? "lg:translate-x-0" : "lg:-translate-x-full",
        ].join(" ")}
        style={{
          background: "rgba(8,7,14,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 pb-4 pt-4">
          {/* Navigation (사용자 정보는 Navbar 우측에 노출) */}
          <nav className="flex-1 space-y-6">
            {/* Admin section */}
            {user.isAdmin && (
              <div>
                <p
                  className="mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: "#F59E0B" }}
                >
                  Admin
                </p>
                <div className="space-y-0.5">
                  {[{ href: "/admin", label: "관리자 대시보드", icon: "admin" }].map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                        style={
                          active
                            ? {
                                background: "rgba(245,158,11,0.1)",
                                border: "1px solid rgba(245,158,11,0.18)",
                                color: "#FCD34D",
                              }
                            : {
                                color: "var(--ink-3)",
                                border: "1px solid transparent",
                              }
                        }
                      >
                        <span style={{ color: active ? "#FCD34D" : "var(--ink-4)" }}>
                          {icons[item.icon]}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic sections */}
            {getNavSections().map((section) => (
              <div key={section.title}>
                <p
                  className="mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--ink-4)" }}
                >
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item: NavItem) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                        style={
                          active
                            ? {
                                background: "rgba(124,58,237,0.1)",
                                border: "1px solid rgba(124,58,237,0.18)",
                                color: "#C4B5FD",
                              }
                            : {
                                color: "var(--ink-3)",
                                border: "1px solid transparent",
                              }
                        }
                      >
                        <span style={{ color: active ? "#A78BFA" : "var(--ink-4)" }}>
                          {icons[item.icon]}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
