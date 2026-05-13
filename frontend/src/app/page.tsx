"use client";

import Link from "next/link";
import { ArrowRight, Search, Map, Lightbulb, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div style={{ background: "#0A0B10", color: "#fff" }} className="snap-container">
      {/* Nav */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: "rgba(10,11,16,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            Widea
          </Link>
          <nav className="hidden items-center gap-6 md:flex" />

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white">로그인</Link>
            <Link
              href="/register"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#5D5DFF,#A855F7)" }}
            >
              무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="snap-section flex items-center justify-center border-b border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center lg:px-8">
          <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-violet-300">
            AI 창업 워크스페이스
          </p>
          <h1
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(2.5rem,7vw,5rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
          >
            세계의 성공을<br />
            <span style={{ color: "#A78BFA" }}>한국으로</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
            글로벌 스타트업 사례 탐색, 한국형 실행 전략 작성, 팀·일정·전문가 협업까지 한 워크스페이스에서 정리합니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#5D5DFF,#A855F7)",
                boxShadow: "0 0 28px rgba(93,93,255,0.4)",
              }}
            >
              지금 무료로 시작하기 <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-zinc-300 hover:text-white"
            >
              로그인
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span>✓ 신용카드 불필요</span>
            <span>✓ 가입 즉시 50 크레딧</span>
            <span>✓ 한국 시장 최적화</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="snap-section flex items-center justify-center border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-5xl px-6 text-center lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300">
            기능
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            창업의 모든 흐름을 한 곳에서.
          </h2>
          <div className="mt-10 grid gap-4 text-left md:grid-cols-2">
            {[
              { icon: Search, title: "글로벌 사례 검색", desc: "100개 이상의 검증된 해외 스타트업 사례를 산업·예산 기준으로 빠르게 탐색합니다." },
              { icon: Map, title: "한국형 실행 전략", desc: "선정한 사례를 한국 시장 맥락에 맞춰 비즈니스 모델·실행 단계로 변환합니다." },
              { icon: Lightbulb, title: "아이디어 매칭", desc: "팀 역량과 예산 조건에 맞는 실행 가능한 아이디어를 추천하고 비교합니다." },
              { icon: BarChart3, title: "검증 기록", desc: "가설을 GO·HOLD·PIVOT으로 기록하고 결정 근거를 워크스페이스에 남깁니다." },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6"
              >
                <f.icon size={22} className="text-violet-300" strokeWidth={1.5} />
                <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="snap-section flex items-center justify-center border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-5xl px-6 text-center lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300">
            작동 방식
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            3단계로 정리됩니다.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", title: "Discovery", desc: "산업·예산을 입력하면 가까운 해외 사례부터 정렬합니다." },
              { n: "02", title: "Blueprint", desc: "선택한 사례를 한국 시장에 맞춘 실행 문서로 변환합니다." },
              { n: "03", title: "Workspace", desc: "단계별 태스크·일정·팀원을 한 워크스페이스에서 관리합니다." },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6"
              >
                <p className="text-xs font-semibold tracking-wider text-violet-300">{s.n}</p>
                <h3 className="mt-3 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="snap-section flex items-center justify-center">
        <div className="mx-auto w-full max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            지금 바로 <span style={{ color: "#A78BFA" }}>시작하세요</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-400">
            가입 즉시 50 크레딧이 지급됩니다. 별도 결제 없이 핵심 기능을 모두 사용해보실 수 있습니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#5D5DFF,#A855F7)",
                boxShadow: "0 0 28px rgba(93,93,255,0.4)",
              }}
            >
              무료 가입하기 <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row lg:px-8">
          <p className="text-sm font-bold text-white">Widea</p>
          <div className="flex items-center gap-5 text-xs text-zinc-500" />

          <p className="text-xs text-zinc-600">© 2026 Widea</p>
        </div>
      </footer>
    </div>
  );
}
