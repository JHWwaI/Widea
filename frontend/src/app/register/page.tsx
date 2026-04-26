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
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between bg-gray-900 px-12 py-14 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">W</span>
          <span className="text-lg font-bold text-white">Widea</span>
        </Link>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">가입 즉시 50 크레딧 지급</span>
            </div>
            <h2 className="text-3xl font-bold leading-snug text-white">
              아이디어를<br />실행으로 이어가세요
            </h2>
            <p className="text-sm leading-relaxed text-gray-400">
              창업가, 투자자, 액셀러레이터를 위한 AI 워크스페이스. 글로벌 사례 탐색부터 한국형 전략 수립까지 한 흐름으로 연결됩니다.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              { step: "01", label: "역할 선택", desc: "창업가·투자자·액셀러레이터" },
              { step: "02", label: "Discovery", desc: "글로벌 사례 탐색 시작" },
              { step: "03", label: "Blueprint & Idea Match", desc: "한국 전략 수립 & 아이디어 검증" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-bold text-blue-500">{s.step}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900">계정 만들기</h1>
            <p className="text-sm text-gray-500">무료로 시작하고 언제든 업그레이드하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? "계정 생성 중..." : "무료로 시작하기"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            이미 계정이 있다면{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              로그인
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-gray-400">
            가입하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
