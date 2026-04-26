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
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between bg-gray-900 px-12 py-14 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">W</span>
          <span className="text-lg font-bold text-white">Widea</span>
        </Link>

        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">AI 창업 워크스페이스</p>
            <h2 className="text-3xl font-bold leading-snug text-white">
              글로벌 사례를<br />한국 전략으로
            </h2>
            <p className="text-sm leading-relaxed text-gray-400">
              Discovery, Blueprint, Idea Match로 이어지는 창업 검증 흐름을 한 곳에서 관리하세요.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              { label: "Discovery", desc: "전 세계 유사 사례 벡터 검색" },
              { label: "Blueprint", desc: "한국 시장 맞춤 실행 전략 생성" },
              { label: "Idea Match", desc: "내 역량·예산에 맞는 아이디어 추천" },
            ].map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-600">© 2025 Widea</p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-16">
        {/* Mobile logo */}
        <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">W</span>
          <span className="text-lg font-bold text-gray-900">Widea</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
            <p className="text-sm text-gray-500">계정으로 워크스페이스에 접속하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                <Link href="/forgot-password" className="text-xs text-blue-500 hover:underline">
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

          <p className="mt-6 text-center text-sm text-gray-500">
            계정이 없다면{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
