"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readError } from "@/lib/product";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) router.replace("/idea-match");
  }, [authLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/idea-match");
    } catch (caught) {
      setError(readError(caught, "이메일 또는 비밀번호를 다시 확인해 주세요."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#07060F" }}>
      {/* ── Left brand panel ── */}
      <div className="relative hidden overflow-hidden border-r border-white/[0.06] bg-zinc-950 lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between px-12 py-14">
        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-sm font-bold text-zinc-950">
            W
          </span>
          <span className="text-lg font-bold text-white">Widea</span>
        </Link>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <p className="eyebrow">한국 창업 워크스페이스</p>
            <h2 className="text-3xl font-bold leading-snug text-white">
              글로벌 사례를<br />한국 전략으로
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              검증된 해외 사례에서 한국형 사업 아이디어를 만들고, 6단계 워크스페이스로 실행까지 안내합니다.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              { label: "아이디어 매칭", desc: "100개 검증 사례 의미 검색" },
              { label: "워크스페이스", desc: "6단계 33개 default 작업" },
              { label: "전문가 매칭", desc: "외주·AC·팀원 직접 컨택" },
            ].map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.03]">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-zinc-500">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-zinc-600">© 2025 Widea</p>
      </div>

      {/* ── Right form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-16">
        {/* Mobile logo */}
        <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-zinc-950">
            W
          </span>
          <span className="text-lg font-bold text-white">Widea</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold text-white">로그인</h1>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>계정으로 워크스페이스에 접속하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "#FCA5A5",
                }}
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="email" className="field-label">이메일</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="field-label">비밀번호</label>
                <Link
                  href="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: "#4F6EF7" }}
                >
                  비밀번호 찾기
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-3)" }}>
            계정이 없다면{" "}
            <Link
              href="/register"
              className="font-semibold transition-colors"
              style={{ color: "#93AFFE" }}
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
