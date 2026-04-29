"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Search, Map, Lightbulb, BarChart3, ArrowRight,
  Sparkles, Globe, Zap, CheckCircle2,
} from "lucide-react";
const ThreeOrb = dynamic(() => import("@/components/ThreeOrb"), { ssr: false });

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
  return (
    <span style={{
      background: "linear-gradient(135deg,#818CF8 0%,#A855F7 50%,#EC4899 100%)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    }}>{children}</span>
  );
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
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#5D5DFF,#A855F7)" }}>W</span>
          <span className="text-sm font-bold tracking-tight text-white">Widea</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {[{href:"/pricing",label:"요금제"},{href:"/community",label:"커뮤니티"},{href:"/contact",label:"문의"}].map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-zinc-500 transition-colors hover:text-white">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-500 transition-colors hover:text-white">로그인</Link>
          <Link href="/register" className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#5D5DFF,#A855F7)", boxShadow: "0 0 18px rgba(93,93,255,0.4)" }}>
            무료로 시작
          </Link>
        </div>
      </header>

      {/* ══ 01 HERO ══ */}
      <section className="snap-section" data-idx="0">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          style={{ width:900, height:700, background:"radial-gradient(ellipse,rgba(93,93,255,0.22) 0%,rgba(168,85,247,0.1) 45%,transparent 70%)", filter:"blur(120px)" }} />
        <div className="pointer-events-none absolute bottom-0 right-0"
          style={{ width:400, height:400, background:"radial-gradient(ellipse,rgba(168,85,247,0.18) 0%,transparent 70%)", filter:"blur(100px)" }} />

        {/* Orb — absolute, centered behind text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
          className="pointer-events-none absolute inset-0 z-0"
          style={{ opacity: 0.55 }}
        >
          <ThreeOrb className="h-full w-full" />
        </motion.div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center lg:px-20">
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.6,ease:EASE}}
            className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background:"rgba(93,93,255,0.1)", border:"1px solid rgba(93,93,255,0.25)" }}>
            <Sparkles size={12} color="#A855F7" />
            <span className="text-xs font-semibold tracking-wide" style={{ color:"#C4B5FD" }}>969개 글로벌 성공 사례 · AI 실시간 분석</span>
          </motion.div>

          <motion.h1 initial={{opacity:0,y:36}} animate={{opacity:1,y:0}} transition={{duration:0.82,ease:EASE,delay:0.08}}
            className="mt-7 font-extrabold text-white"
            style={{ fontSize:"clamp(3rem,8vw,7.5rem)", letterSpacing:"-0.05em", lineHeight:1.0 }}>
            세계의 성공을<br /><GradText>한국으로</GradText>
          </motion.h1>

          <motion.p initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.72,ease:EASE,delay:0.18}}
            className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-zinc-500">
            AI가 969개의 글로벌 스타트업 사례를 분석하고, 당신의 역량에 맞는 한국형 실행 전략을 즉시 생성합니다.
          </motion.p>

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7,ease:EASE,delay:0.28}}
            className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background:"linear-gradient(135deg,#5D5DFF,#A855F7)", boxShadow:"0 0 28px rgba(93,93,255,0.5)" }}>
              지금 무료로 시작하기 <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="rounded-full px-6 py-3 text-sm font-medium text-zinc-400 transition-all hover:text-white"
              style={{ border:"1px solid rgba(255,255,255,0.1)" }}>로그인</Link>
          </motion.div>

          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5,duration:0.6}}
            className="mt-5 flex flex-wrap items-center justify-center gap-5">
            {["신용카드 불필요","가입 즉시 50 크레딧","즉시 사용 가능"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} color="#A855F7" />
                <span className="text-xs text-zinc-600">{t}</span>
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
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
          style={{ width:500, height:500, background:"radial-gradient(ellipse,rgba(93,93,255,0.14) 0%,transparent 70%)", filter:"blur(120px)" }} />
        <div className="relative z-10 flex h-full flex-col justify-center px-8 py-24 lg:px-16 lg:py-0">
          <Reveal><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">02 · Services</p></Reveal>
          <Reveal delay={1}>
            <h2 className="mb-8 font-extrabold text-white"
              style={{ fontSize:"clamp(2rem,4vw,3.2rem)", letterSpacing:"-0.05em", lineHeight:1.0 }}>
              창업의 모든 흐름을<br /><GradText>한 곳에서</GradText>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Discovery — wide */}
            <Reveal delay={2} className="md:col-span-2">
              <div className="glow-card group relative overflow-hidden p-8" style={{ minHeight:200 }}>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background:"radial-gradient(ellipse at 30% 50%,rgba(93,93,255,0.12),transparent 60%)" }} />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background:"rgba(93,93,255,0.15)", border:"1px solid rgba(93,93,255,0.25)" }}>
                      <Search size={18} color="#818CF8" />
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background:"rgba(93,93,255,0.12)", border:"1px solid rgba(93,93,255,0.2)", color:"#818CF8" }}>글로벌 시장</span>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-2xl font-extrabold text-white" style={{ letterSpacing:"-0.04em" }}>Discovery</h3>
                    <p className="text-sm leading-relaxed text-zinc-500">969개의 글로벌 스타트업 사례를 벡터 검색으로 탐색하세요. 업종, 수익 모델, 투자 단계별 벤치마크를 즉시 발굴합니다.</p>
                    <Link href="/discovery" className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color:"#818CF8" }}>탐색 시작 <ArrowRight size={13} /></Link>
                  </div>
                </div>
              </div>
            </Reveal>
            {/* Blueprint */}
            <Reveal delay={3}>
              <div className="glow-card group relative overflow-hidden p-8" style={{ minHeight:200, borderColor:"rgba(168,85,247,0.18)" }}>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background:"radial-gradient(ellipse at 70% 30%,rgba(168,85,247,0.12),transparent 60%)" }} />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background:"rgba(168,85,247,0.12)", border:"1px solid rgba(168,85,247,0.22)" }}>
                    <Map size={18} color="#C084FC" />
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-2xl font-extrabold text-white" style={{ letterSpacing:"-0.04em" }}>Blueprint</h3>
                    <p className="text-sm leading-relaxed text-zinc-500">해외 사례를 한국 시장에 맞는 실행 전략으로 AI가 즉시 변환합니다.</p>
                  </div>
                </div>
              </div>
            </Reveal>
            {/* Idea Match */}
            <Reveal delay={4}>
              <div className="glow-card group relative overflow-hidden p-8" style={{ minHeight:200, borderColor:"rgba(236,72,153,0.18)" }}>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background:"radial-gradient(ellipse at 30% 70%,rgba(236,72,153,0.1),transparent 60%)" }} />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background:"rgba(236,72,153,0.1)", border:"1px solid rgba(236,72,153,0.2)" }}>
                    <Lightbulb size={18} color="#F472B6" />
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-2xl font-extrabold text-white" style={{ letterSpacing:"-0.04em" }}>Idea Match</h3>
                    <p className="text-sm leading-relaxed text-zinc-500">팀 역량과 예산에 딱 맞는 실행 가능한 아이디어 5개를 AI가 추천합니다.</p>
                  </div>
                </div>
              </div>
            </Reveal>
            {/* Validation — wide */}
            <Reveal delay={5} className="md:col-span-2">
              <div className="glow-card group relative overflow-hidden p-8" style={{ minHeight:200, borderColor:"rgba(52,211,153,0.15)" }}>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background:"radial-gradient(ellipse at 60% 50%,rgba(52,211,153,0.08),transparent 60%)" }} />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.2)" }}>
                      <BarChart3 size={18} color="#34D399" />
                    </div>
                    <div className="flex gap-2">
                      {[["GO","rgba(52,211,153,0.1)","rgba(52,211,153,0.2)","#34D399"],["HOLD","rgba(251,191,36,0.1)","rgba(251,191,36,0.2)","#FCD34D"],["PIVOT","rgba(239,68,68,0.1)","rgba(239,68,68,0.2)","#F87171"]].map(([tag,bg,br,c]) => (
                        <span key={tag} className="rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{ background:bg, border:`1px solid ${br}`, color:c }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-2xl font-extrabold text-white" style={{ letterSpacing:"-0.04em" }}>Validation Ledger</h3>
                    <p className="text-sm leading-relaxed text-zinc-500">아이디어의 가설을 세우고 GO / PIVOT / HOLD 결정을 기록하세요. 창업 여정의 모든 검증 과정을 투명하게 추적합니다.</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ 03 HOW IT WORKS ══ */}
      <section className="snap-section" data-idx="2">
        <div className="pointer-events-none absolute right-0 top-1/3"
          style={{ width:600, height:600, background:"radial-gradient(ellipse,rgba(168,85,247,0.14) 0%,transparent 70%)", filter:"blur(120px)" }} />
        <div className="relative z-10 flex h-full flex-col justify-center px-8 py-24 lg:px-16 lg:py-0">
          <Reveal><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">03 · Workflow</p></Reveal>
          <Reveal delay={1}>
            <h2 className="mb-12 font-extrabold text-white"
              style={{ fontSize:"clamp(2rem,4vw,3.2rem)", letterSpacing:"-0.05em", lineHeight:1.0 }}>
              3단계로 완성되는<br /><GradText>창업 전략</GradText>
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step:"01", icon:<Globe size={20} color="#818CF8" />, ibg:"rgba(93,93,255,0.12)", ibr:"rgba(93,93,255,0.22)", title:"Discovery", desc:"969개 DB에서 내 산업과 가장 가까운 해외 사례를 벡터 검색으로 발굴합니다.", ab:"rgba(93,93,255,0.18)", abb:"rgba(93,93,255,0.06)" },
              { step:"02", icon:<Map size={20} color="#C084FC" />, ibg:"rgba(168,85,247,0.12)", ibr:"rgba(168,85,247,0.22)", title:"Blueprint", desc:"선택한 사례를 기반으로 한국 시장에 맞는 비즈니스 전략 문서를 AI가 생성합니다.", ab:"rgba(168,85,247,0.18)", abb:"rgba(168,85,247,0.06)" },
              { step:"03", icon:<Zap size={20} color="#F472B6" />, ibg:"rgba(236,72,153,0.1)", ibr:"rgba(236,72,153,0.2)", title:"Idea Match", desc:"팀 역량·예산·타깃을 입력하면 현실적인 실행 아이디어 5개가 즉시 제안됩니다.", ab:"rgba(236,72,153,0.18)", abb:"rgba(236,72,153,0.06)" },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i+2}>
                <div className="glow-card group relative overflow-hidden p-8" style={{ borderColor:item.ab }}>
                  <div className="pointer-events-none absolute inset-0 rounded-[2rem]" style={{ background:item.abb }} />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background:item.ibg, border:`1px solid ${item.ibr}` }}>{item.icon}</div>
                      <span className="font-black text-zinc-800" style={{ fontSize:"2.5rem", letterSpacing:"-0.06em" }}>{item.step}</span>
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-extrabold text-white" style={{ letterSpacing:"-0.04em" }}>{item.title}</h3>
                      <p className="text-sm leading-relaxed text-zinc-500">{item.desc}</p>
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
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width:800, height:800, background:"radial-gradient(ellipse,rgba(93,93,255,0.2) 0%,rgba(168,85,247,0.1) 40%,transparent 70%)", filter:"blur(120px)" }} />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <Reveal><p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">04 · Get Started</p></Reveal>
          <Reveal delay={1}>
            <h2 className="mx-auto max-w-3xl font-extrabold text-white"
              style={{ fontSize:"clamp(3rem,8vw,7rem)", letterSpacing:"-0.055em", lineHeight:0.95 }}>
              지금 바로<br /><GradText>시작하세요</GradText>
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="mx-auto mt-7 max-w-md text-base leading-relaxed text-zinc-500">
              가입 즉시 50 크레딧이 지급됩니다. Discovery, Blueprint, Idea Match를 모두 무료로 체험하세요.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
              <Link href="/register" className="group inline-flex items-center gap-2 rounded-full px-10 py-3.5 text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background:"linear-gradient(135deg,#5D5DFF,#A855F7)", boxShadow:"0 0 32px rgba(93,93,255,0.5)" }}>
                무료 가입하기 <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-zinc-500 transition-colors hover:text-white">요금제 확인 →</Link>
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
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
              style={{ background:"linear-gradient(135deg,#5D5DFF,#A855F7)" }}>W</span>
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
