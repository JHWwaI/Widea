"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Search, Map, Lightbulb, BarChart3, ArrowRight,
  Globe, Zap, CheckCircle2,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: EASE, delay: delay * 0.12 }}
    >{children}</motion.div>
  );
}

function ScrollDots({ active }: { active: number }) {
  return (
    <div className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      {[0,1,2,3].map((i) => (
        <motion.div key={i}
          animate={{ width: i===active?6:3, height: i===active?6:3, opacity: i===active?1:0.22 }}
          transition={{ duration: 0.28 }}
          style={{ borderRadius:"50%", background:"#fff", alignSelf:"center" }}
        />
      ))}
    </div>
  );
}

function GradText({ children }: { children: React.ReactNode }) {
  return <span className="text-white">{children}</span>;
}

function Grain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9001]" style={{
      opacity: 0.042,
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
      backgroundSize: "300px 300px",
    }} />
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx)); }),
      { root: el, threshold: 0.5 }
    );
    el.querySelectorAll<HTMLElement>(".snap-section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="snap-container" style={{ background: "#0A0B10", color: "#fff" }}>
      <Grain />
      <ScrollDots active={active} />

      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-8 py-5 lg:px-16"
        style={{ background: "rgba(10,11,16,0.75)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-zinc-950">W</span>
          <span className="text-sm font-bold tracking-tight text-white">Widea</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {[{href:"/pricing",label:"요금제"},{href:"/community",label:"커뮤니티"},{href:"/contact",label:"문의"}].map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-zinc-500 transition-colors hover:text-white">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-500 transition-colors hover:text-white">로그인</Link>
          <Link href="/register" className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100">
            무료로 시작
          </Link>
        </div>
      </header>

      {/* ══ 01 HERO ══ */}
      <section className="snap-section" data-idx="0">
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center lg:px-20">
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.6,ease:EASE}}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">969개 검증 사례 · 의미 검색</span>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:36}} animate={{opacity:1,y:0}} transition={{duration:0.82,ease:EASE,delay:0.08}}
            className="mt-7 font-bold tracking-tight text-white"
            style={{ fontSize:"clamp(2.75rem,7vw,6rem)", letterSpacing:"-0.04em", lineHeight:1.05 }}>
            세계의 성공을<br />한국으로
          </motion.h1>

          <motion.p initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.72,ease:EASE,delay:0.18}}
            className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-zinc-400">
            969개 글로벌 스타트업 사례에서 본인 산업·예산에 맞는 한국형 실행 전략을 만들어냅니다.
          </motion.p>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7,ease:EASE,delay:0.28}}
            className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100">
              지금 무료로 시작하기 <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="rounded-md border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white">로그인</Link>
          </motion.div>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5,duration:0.6}}
            className="mt-6 flex flex-wrap items-center justify-center gap-5">
            {["신용카드 불필요","가입 즉시 50 크레딧","즉시 사용 가능"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-zinc-600" />
                <span className="text-xs text-zinc-500">{t}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-800">
          <span className="text-[9px] font-semibold uppercase tracking-[0.25em]">scroll</span>
          <div style={{ width:1, height:38, background:"linear-gradient(to bottom,rgba(255,255,255,0.18),transparent)", animation:"scrollLine 1.8s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ══ 02 BENTO ══ */}
      <section className="snap-section" data-idx="1">
        <div className="relative z-10 flex h-full flex-col justify-center px-8 py-24 lg:px-16 lg:py-0">
          <Reveal><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">02 · Services</p></Reveal>
          <Reveal delay={1}>
            <h2 className="mb-8 font-extrabold text-white"
              style={{ fontSize:"clamp(2rem,4vw,3.2rem)", letterSpacing:"-0.05em", lineHeight:1.0 }}>
              창업의 모든 흐름을<br /><GradText>한 곳에서</GradText>
            </h2>
          </Reveal>
          <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06] md:grid-cols-3">
            {/* 아이디어 매칭 — wide */}
            <Reveal delay={2} className="md:col-span-2">
              <div className="group relative h-full bg-zinc-950 p-8 transition-colors hover:bg-white/[0.025]" style={{ minHeight:200 }}>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                    <Search size={18} className="text-zinc-300" />
                  </div>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs font-medium text-zinc-300">글로벌 시장</span>
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">아이디어 매칭</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">100개의 글로벌 검증 사례를 의미 검색해 본인 산업·예산에 맞춘 한국형 사업 아이디어 3개를 즉시 생성합니다.</p>
                  <Link href="/idea-match" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white">아이디어 만들기 <ArrowRight size={13} /></Link>
                </div>
              </div>
            </Reveal>
            {/* Blueprint */}
            <Reveal delay={3}>
              <div className="group relative h-full bg-zinc-950 p-8 transition-colors hover:bg-white/[0.025]" style={{ minHeight:200 }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                  <Map size={18} className="text-zinc-300" />
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">Blueprint</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">해외 사례를 한국 시장에 맞는 실행 전략으로 변환합니다.</p>
                </div>
              </div>
            </Reveal>
            {/* Workspace */}
            <Reveal delay={4}>
              <div className="group relative h-full bg-zinc-950 p-8 transition-colors hover:bg-white/[0.025]" style={{ minHeight:200 }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                  <Lightbulb size={18} className="text-zinc-300" />
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">워크스페이스</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">6단계 33개 작업으로 아이디어부터 첫 100명까지 안내합니다.</p>
                </div>
              </div>
            </Reveal>
            {/* Validation — wide */}
            <Reveal delay={5} className="md:col-span-2">
              <div className="group relative h-full bg-zinc-950 p-8 transition-colors hover:bg-white/[0.025]" style={{ minHeight:200 }}>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                    <BarChart3 size={18} className="text-zinc-300" />
                  </div>
                  <div className="flex gap-2">
                    {["GO", "HOLD", "PIVOT"].map((tag) => (
                      <span key={tag} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-zinc-300">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">Validation Ledger</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">아이디어의 가설을 세우고 GO / PIVOT / HOLD 결정을 기록하세요. 창업 여정의 모든 검증 과정을 투명하게 추적합니다.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ 03 HOW IT WORKS ══ */}
      <section className="snap-section" data-idx="2">
        <div className="relative z-10 flex h-full flex-col justify-center px-8 py-24 lg:px-16 lg:py-0">
          <Reveal><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">03 · Workflow</p></Reveal>
          <Reveal delay={1}>
            <h2 className="mb-12 font-extrabold text-white"
              style={{ fontSize:"clamp(2rem,4vw,3.2rem)", letterSpacing:"-0.05em", lineHeight:1.0 }}>
              3단계로 완성되는<br /><GradText>창업 전략</GradText>
            </h2>
          </Reveal>
          <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.06] md:grid-cols-3">
            {[
              { step:"01", icon:<Globe size={20} className="text-zinc-300" />, title:"Discovery", desc:"969개 DB에서 내 산업과 가장 가까운 해외 사례를 벡터 검색으로 발굴합니다." },
              { step:"02", icon:<Map size={20} className="text-zinc-300" />, title:"Blueprint", desc:"선택한 사례를 기반으로 한국 시장에 맞는 비즈니스 전략 문서를 자동 생성합니다." },
              { step:"03", icon:<Zap size={20} className="text-zinc-300" />, title:"Idea Match", desc:"팀 역량·예산·타깃을 입력하면 현실적인 실행 아이디어 3개가 즉시 제안됩니다." },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i+2}>
                <div className="group relative h-full bg-zinc-950 p-8 transition-colors hover:bg-white/[0.025]">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">{item.icon}</div>
                      <span className="display-num text-4xl text-white/[0.18]">{item.step}</span>
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-bold tracking-tight text-white">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 04 CTA ══ */}
      <section className="snap-section" data-idx="3">
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <Reveal><p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">04 · Get Started</p></Reveal>
          <Reveal delay={1}>
            <h2 className="mx-auto max-w-3xl font-bold text-white"
              style={{ fontSize:"clamp(2.75rem,7vw,6rem)", letterSpacing:"-0.04em", lineHeight:1.05 }}>
              지금 바로<br />시작하세요
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-400">
              가입 즉시 50 크레딧이 지급됩니다. 아이디어 매칭부터 워크스페이스 실행까지 무료로 체험하세요.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
              <Link href="/register" className="group inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100">
                무료 가입하기 <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">요금제 확인 →</Link>
            </div>
          </Reveal>
          <Reveal delay={4}>
            <div className="mt-16 flex items-center">
              {[{n:"969+",label:"글로벌 사례"},{n:"10K+",label:"전략 생성"},{n:"200+",label:"활성 팀"}].map((s, i) => (
                <div key={s.label} className="px-10 text-center first:pl-0 last:pr-0"
                  style={{ borderLeft: i>0 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                  <p className="font-extrabold text-white" style={{ fontSize:"1.875rem", letterSpacing:"-0.04em" }}>{s.n}</p>
                  <p className="mt-1 text-xs text-zinc-600">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-between gap-3 px-8 py-5 sm:flex-row"
          style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-[10px] font-bold text-zinc-950">W</span>
            <span className="text-sm font-bold tracking-tight text-white">Widea</span>
          </div>
          <div className="flex items-center gap-6">
            {[{href:"/pricing",label:"요금제"},{href:"/community",label:"커뮤니티"},{href:"/contact",label:"문의"}].map((n) => (
              <Link key={n.href} href={n.href} className="text-xs text-zinc-700 transition-colors hover:text-zinc-400">{n.label}</Link>
            ))}
          </div>
          <p className="text-xs text-zinc-800">© 2025 Widea</p>
        </div>
      </section>

      <style>{`
        @keyframes scrollLine {
          0%   { transform: scaleY(0); transform-origin: top; }
          50%  { transform: scaleY(1); transform-origin: top; }
          51%  { transform: scaleY(1); transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; }
        }
      `}</style>
    </div>
  );
}
