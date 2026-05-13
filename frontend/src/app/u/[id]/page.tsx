"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/ProductUI";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import SendCollabRequestButton from "@/components/SendCollabRequestButton";

type ExpertCategory = string;

type Career = { company: string; role: string; period: string; summary: string };
type PortfolioItem = { title: string; role: string; stack: string[]; summary: string; url: string };
type Education = { school: string; degree: string; period: string };
type Certification = { name: string; issuer: string; year: string };

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
  yearsOfExperience: number | null;
  availability: string | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  languages: string[];
  industries: string[];
  careers: Career[];
  portfolioItems: PortfolioItem[];
  education: Education[];
  certifications: Certification[];
  available: boolean;
  viewCount: number;
};

type User = { id: string; name: string | null; email: string; createdAt: string };

const CATEGORY_LABEL: Record<string, string> = {
  DEVELOPER: "개발자(일반)",
  FRONTEND_DEV: "프론트엔드 개발자",
  BACKEND_DEV: "백엔드 개발자",
  FULLSTACK_DEV: "풀스택 개발자",
  MOBILE_DEV: "모바일 개발자",
  AI_DEV: "AI/ML 개발자",
  DEVOPS: "DevOps·인프라",
  DATA_ENGINEER: "데이터 엔지니어",
  DESIGNER: "디자이너(일반)",
  UI_UX_DESIGNER: "UI/UX 디자이너",
  GRAPHIC_DESIGNER: "그래픽·브랜드 디자이너",
  MARKETER: "마케터(일반)",
  GROWTH_MARKETER: "그로스 마케터",
  CONTENT_MARKETER: "콘텐츠 마케터",
  AC_MENTOR: "AC·멘토",
  PLANNER: "기획자",
  PM: "PM",
  BUSINESS_DEV: "사업개발",
  LAWYER: "법무·변호사",
  ACCOUNTANT: "세무·회계",
  OTHER: "기타",
};

const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "원격",
  HYBRID: "하이브리드",
  ONSITE: "오피스",
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
            <p className="eyebrow text-violet-300">
              {CATEGORY_LABEL[profile.category] ?? profile.category}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white">
              {user?.name || "익명 전문가"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              {profile.location ? <span>📍 {profile.location}</span> : null}
              {typeof profile.yearsOfExperience === "number" ? (
                <span>경력 {profile.yearsOfExperience}년차</span>
              ) : null}
              {profile.workMode ? (
                <span>{WORK_MODE_LABEL[profile.workMode] ?? profile.workMode}</span>
              ) : null}
              {profile.availability ? <span>{profile.availability}</span> : null}
            </div>
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
          <div className="flex gap-2">
            {user?.email ? (
              <a
                href={`mailto:${user.email}`}
                className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_24px_-4px_rgba(124,58,237,0.5)] hover:bg-violet-400"
              >
                💬 이메일로 컨택
              </a>
            ) : null}
          </div>
        </div>

        {/* 워크스페이스 협업 요청 */}
        <SendCollabRequestButton expertUserId={profile.userId} />
      </section>

      {/* 자세한 소개 */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="eyebrow">소개</p>
        <p className="whitespace-pre-wrap text-base leading-7 text-zinc-200">
          {profile.bio}
        </p>
      </section>

      {/* 경력 이력 */}
      {profile.careers && profile.careers.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="eyebrow">경력 이력</p>
          <ul className="space-y-4">
            {profile.careers.map((c, i) => (
              <li key={i} className="border-l-2 border-violet-400/40 pl-4">
                <p className="text-base font-bold text-white">
                  {c.company}
                  <span className="ml-2 text-sm font-normal text-zinc-300">· {c.role}</span>
                </p>
                {c.period ? <p className="text-xs text-zinc-500">{c.period}</p> : null}
                {c.summary ? (
                  <p className="mt-1 text-sm leading-6 text-zinc-300 whitespace-pre-wrap">
                    {c.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 대표 프로젝트 */}
      {profile.portfolioItems && profile.portfolioItems.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="eyebrow">대표 프로젝트</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.portfolioItems.map((p, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-white">
                  {p.title}
                  {p.role ? <span className="ml-2 text-xs font-normal text-zinc-400">· {p.role}</span> : null}
                </p>
                {p.summary ? (
                  <p className="mt-1 text-xs leading-5 text-zinc-300 whitespace-pre-wrap">{p.summary}</p>
                ) : null}
                {p.stack && p.stack.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.stack.map((s) => (
                      <span key={s} className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[0.65rem] text-violet-200">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-violet-300 hover:underline"
                  >
                    프로젝트 보기 ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 도메인 + 언어 */}
      {(profile.industries?.length || 0) > 0 || (profile.languages?.length || 0) > 0 ? (
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2">
          {profile.industries && profile.industries.length > 0 ? (
            <div>
              <p className="eyebrow">도메인 경험</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.industries.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200 ring-1 ring-amber-400/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {profile.languages && profile.languages.length > 0 ? (
            <div>
              <p className="eyebrow">사용 언어</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.languages.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200 ring-1 ring-sky-400/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 학력 + 자격증 */}
      {(profile.education?.length || 0) > 0 || (profile.certifications?.length || 0) > 0 ? (
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2">
          {profile.education && profile.education.length > 0 ? (
            <div className="space-y-2">
              <p className="eyebrow">학력</p>
              <ul className="space-y-1.5 text-sm">
                {profile.education.map((ed, i) => (
                  <li key={i}>
                    <p className="font-semibold text-white">{ed.school}</p>
                    {ed.degree ? <p className="text-xs text-zinc-400">{ed.degree}</p> : null}
                    {ed.period ? <p className="text-xs text-zinc-500">{ed.period}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {profile.certifications && profile.certifications.length > 0 ? (
            <div className="space-y-2">
              <p className="eyebrow">자격증·수상</p>
              <ul className="space-y-1.5 text-sm">
                {profile.certifications.map((c, i) => (
                  <li key={i}>
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-zinc-400">
                      {c.issuer}{c.year ? ` · ${c.year}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

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
