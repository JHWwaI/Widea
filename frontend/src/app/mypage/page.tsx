"use client";

import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { planLabels, userTypeLabels } from "@/lib/product";
import FounderHome from "@/components/mypage/FounderHome";
import AcceleratorHome from "@/components/mypage/AcceleratorHome";
import InvestorHome from "@/components/mypage/InvestorHome";

export default function MyPage() {
  const { user } = useAuth();
  const role = user?.userType ?? "FOUNDER";

  // CTA 버튼 — 역할별 다름
  const cta =
    role === "ACCELERATOR"
      ? { href: "/accelerator", label: "팀 발굴 파이프라인" }
      : role === "INVESTOR"
        ? { href: "/discovery", label: "시장 탐색" }
        : { href: "/idea-match", label: "새 아이디어 탐색" };

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-8 fade-up pb-12">
        {/* 헤더 (역할 무관 공통) */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow">
              {role === "ACCELERATOR"
                ? "엑셀레이터 워크스페이스"
                : role === "INVESTOR"
                  ? "투자자 워크스페이스"
                  : "내 워크스페이스"}
            </p>
            <h1 className="editorial-h1">
              안녕하세요{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-sm text-zinc-400">
              {user?.userType ? userTypeLabels[user.userType] : "역할 미설정"} ·{" "}
              {user ? planLabels[user.planType] || user.planType : "-"} 플랜 ·{" "}
              크레딧 {user?.isAdmin ? "Unlimited" : (user?.creditBalance ?? 0)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/mypage/edit"
              className="rounded-md border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:border-violet-400/50 hover:bg-violet-500/20"
              aria-label="내 정보 편집"
              title="내 정보 편집"
            >
              ⚙ 내 정보 편집
            </Link>
            <Link href={cta.href} className="btn-primary">
              {cta.label}
            </Link>
          </div>
        </header>

        {/* 역할별 본문 */}
        {role === "ACCELERATOR" ? (
          <AcceleratorHome />
        ) : role === "INVESTOR" ? (
          <InvestorHome />
        ) : (
          <FounderHome />
        )}
      </div>
    </AuthGuard>
  );
}
