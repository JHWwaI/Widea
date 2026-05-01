"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readError } from "@/lib/product";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace(user.userType ? "/idea-match" : "/select-type");
  }, [authLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, name);
      router.push("/select-type");
    } catch (caught) {
      setError(readError(caught, "회원가입에 실패했습니다. 입력값을 다시 확인해 주세요."));
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
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-xs font-medium text-zinc-300">
                가입 즉시 50 크레딧 지급
              </span>
            </div>
            <h2 className="text-3xl font-bold leading-snug text-white">
              아이디어를<br />실행으로 이어가세요
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              창업가, 투자자, 액셀러레이터를 위한 워크스페이스. 글로벌 사례 탐색부터 한국형 전략 수립까지.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { step: "01", label: "역할 선택", desc: "창업가·투자자·액셀러레이터" },
              { step: "02", label: "아이디어 매칭", desc: "글로벌 검증 사례에서 한국형 아이디어" },
              { step: "03", label: "워크스페이스 실행", desc: "6단계 작업으로 검증·실행" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-medium text-zinc-500">{s.step}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  <p className="text-xs text-zinc-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
            <h1 className="text-2xl font-bold text-white">계정 만들기</h1>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>무료로 시작하고 언제든 업그레이드하세요.</p>
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
              <label htmlFor="name" className="field-label">이름</label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

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
              <label htmlFor="password" className="field-label">비밀번호</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="최소 6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "계정 생성 중..." : "무료로 시작하기"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-3)" }}>
            이미 계정이 있다면{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors"
              style={{ color: "#93AFFE" }}
            >
              로그인
            </Link>
          </p>

          <p className="mt-4 text-center text-xs" style={{ color: "var(--ink-4)" }}>
            가입하면 이용약관 및 개인정보처리방침에 동의합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
