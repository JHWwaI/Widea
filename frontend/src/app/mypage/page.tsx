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

  const cta =
    role === "ACCELERATOR"
      ? { href: "/community?category=TEAM_RECRUIT", label: "팀 모집 피드 보기" }
      : role === "INVESTOR"
        ? { href: "/community?category=TEAM_RECRUIT", label: "진행 중인 팀 둘러보기" }
        : { href: "/idea-match", label: "새 아이디어 만들기" };

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
              className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]"
              aria-label="내 정보 편집"
              title="내 정보 편집"
            >
              내 정보 편집
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
