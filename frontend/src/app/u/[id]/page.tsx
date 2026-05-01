"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/ProductUI";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type ExpertCategory =
  | "DEVELOPER"
  | "DESIGNER"
  | "MARKETER"
  | "AC_MENTOR"
  | "PLANNER"
  | "PM"
  | "OTHER";

type Profile = {
  id: string;
  userId: string;
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string | null;
  available: boolean;
  viewCount: number;
};

type User = { id: string; name: string | null; email: string; createdAt: string };

const CATEGORY_LABEL: Record<ExpertCategory, string> = {
  DEVELOPER: "개발자",
  DESIGNER: "디자이너",
  MARKETER: "마케터",
  AC_MENTOR: "AC·멘토",
  PLANNER: "기획자",
  PM: "PM",
  OTHER: "기타",
};

export default function UserProfilePage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<{ profile: Profile; user: User }>("GET", `/api/experts/${id}`)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.profile);
        setUser(res.user);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로필 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingState label="프로필 불러오는 중..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <p className="text-sm text-rose-300">{error || "프로필을 찾을 수 없습니다."}</p>
        <Link href="/talent" className="btn-primary">전문가 목록으로</Link>
      </div>
    );
  }

  function formatRate(min: number | null, max: number | null) {
    if (min == null && max == null) return "협의";
    const fmt = (n: number) => `${(n / 10000).toLocaleString()}만`;
    if (min != null && max != null) return `${fmt(min)} ~ ${fmt(max)}원/시간`;
    if (min != null) return `${fmt(min)}원~/시간`;
    return `~${fmt(max!)}원/시간`;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 fade-up pb-12">
      <header>
        <Link href="/talent" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← 전문가 목록
        </Link>
      </header>

      {/* 프로필 헤더 */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow text-violet-300">{CATEGORY_LABEL[profile.category]}</p>
            <h1 className="mt-1 text-3xl font-bold text-white">
              {user?.name || "익명 전문가"}
            </h1>
            {profile.location ? (
              <p className="mt-1 text-sm text-zinc-400">{profile.location}</p>
            ) : null}
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${
              profile.available
                ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30"
                : "bg-zinc-700/40 text-zinc-400 ring-white/10"
            }`}
          >
            {profile.available ? "영입 가능" : "비활성"}
          </span>
        </div>

        <p className="text-base font-semibold text-zinc-100">{profile.headline}</p>

        {profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200 ring-1 ring-violet-400/20"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <p className="text-base font-bold text-emerald-300">
            {formatRate(profile.hourlyRateMin, profile.hourlyRateMax)}
          </p>
          {user?.email ? (
            <a
              href={`mailto:${user.email}`}
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
            >
              이메일로 컨택
            </a>
          ) : null}
        </div>
      </section>

      {/* 자세한 소개 */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="eyebrow">소개</p>
        <p className="whitespace-pre-wrap text-base leading-7 text-zinc-200">
          {profile.bio}
        </p>
      </section>

      {/* 링크 */}
      {profile.links.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="eyebrow">포트폴리오·링크</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {profile.links.map((l, i) => (
              <a
                key={`${l.url}-${i}`}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-violet-400/30 hover:bg-violet-500/[0.06]"
              >
                <p className="text-sm font-semibold text-white">{l.label} ↗</p>
                <p className="truncate text-xs text-zinc-500">{l.url}</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* 푸터 메타 */}
      <p className="text-center text-xs text-zinc-600">
        조회 {profile.viewCount}회{user?.createdAt ? ` · 가입 ${new Date(user.createdAt).toLocaleDateString("ko-KR")}` : ""}
      </p>
    </div>
  );
}
