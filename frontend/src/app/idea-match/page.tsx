"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { budgetRangeOptions, getCreditErrorDetails, readError, splitTags } from "@/lib/product";
import type {
  IdeaMatchResponse,
  IdeaMatchSessionListResponse,
} from "@/lib/types";

const IDEA_MATCH_CREDIT_COST = 10;

const INDUSTRY_CATEGORIES = [
  { group: "AI & Data", items: ["AI", "AI / VoiceTech", "AI / DesignTech", "AIMLOps", "Data Analytics"], count: 85 },
  { group: "SaaS & B2B", items: ["SaaS", "Vertical SaaS", "HRTech", "LegalTech", "RegTech"], count: 142 },
  { group: "FinTech & InsurTech", items: ["FinTech", "InsurTech", "WealthTech", "PaymentTech", "Lending"], count: 98 },
  { group: "Healthcare & Bio", items: ["HealthTech", "MedTech", "BioTech", "FemTech", "Mental Health"], count: 76 },
  { group: "EdTech & HR", items: ["EdTech", "SkillTech", "HRTech", "Recruitment", "Training"], count: 64 },
  { group: "Commerce & D2C", items: ["E-Commerce", "Marketplace", "D2C", "RetailTech", "Social Commerce"], count: 72 },
  { group: "Food & Agriculture", items: ["FoodTech", "AgTech", "F&B", "Restaurant Tech", "Delivery"], count: 89 },
  { group: "Logistics & Mobility", items: ["LogisticsTech", "Mobility", "DeliveryTech", "SupplyChain"], count: 45 },
  { group: "Property & Construction", items: ["PropTech", "ConstructionTech", "AEC Tech", "Real Estate"], count: 38 },
  { group: "Climate & Energy", items: ["CleanTech", "EnergyTech", "ESG", "WasteManagement", "AgriTech"], count: 62 },
  { group: "Content & Creator", items: ["Creator Economy", "MediaTech", "Gaming", "Entertainment"], count: 43 },
  { group: "Travel & Hospitality", items: ["TravelTech", "Hospitality", "Tourism", "EventTech"], count: 35 },
];

const REVENUE_MODELS = [
  { value: "SaaS", label: "SaaS 구독", desc: "월/연 단위 소프트웨어 구독", dbCount: 187 },
  { value: "Marketplace", label: "마켓플레이스", desc: "거래 수수료 기반", dbCount: 124 },
  { value: "Transaction Fee", label: "거래 수수료", desc: "건당 수수료 과금", dbCount: 156 },
  { value: "Freemium", label: "프리미엄", desc: "무료 + 유료 전환", dbCount: 89 },
  { value: "Product Sales", label: "제품 판매", desc: "직접 제품/하드웨어 판매", dbCount: 112 },
  { value: "Subscription", label: "구독 서비스", desc: "정기 결제 기반", dbCount: 203 },
  { value: "Commission", label: "커미션/중개", desc: "중개 수수료", dbCount: 98 },
  { value: "Ad-based", label: "광고 기반", desc: "광고 수익", dbCount: 34 },
];

const TARGET_MARKETS = [
  { value: "B2C", label: "B2C", desc: "일반 소비자", icon: "👤" },
  { value: "B2B", label: "B2B", desc: "기업 고객", icon: "🏢" },
  { value: "B2B2C", label: "B2B2C", desc: "파트너 경유", icon: "🔗" },
];

const FUNDING_STAGES = [
  { value: "Pre-Seed", label: "Pre-Seed", desc: "초기 아이디어 단계" },
  { value: "Seed", label: "Seed", desc: "제품 검증 단계" },
  { value: "Series A", label: "Series A", desc: "PMF 달성 후 성장" },
  { value: "Series B", label: "Series B+", desc: "스케일업 단계" },
];

const BUDGET_OPTIONS = [
  { value: "ZERO", label: "무자본" },
  { value: "UNDER_5M", label: "500만원 이하" },
  { value: "FIVE_TO_10M", label: "500~1,000만원" },
  { value: "TEN_TO_30M", label: "1,000~3,000만원" },
  { value: "THIRTY_TO_50M", label: "3,000~5,000만원" },
  { value: "FIFTY_TO_100M", label: "5,000만~1억" },
  { value: "OVER_100M", label: "1억원 이상" },
];

const TEAM_OPTIONS = [
  { value: "SOLO", label: "1인", icon: "👤" },
  { value: "TWO_TO_THREE", label: "2~3인", icon: "👥" },
  { value: "FOUR_TO_TEN", label: "4~10인", icon: "👥" },
  { value: "OVER_TEN", label: "10인+", icon: "🏢" },
];

const STEPS = [
  { id: 1, label: "산업 분야", desc: "어떤 분야에 관심 있나요?" },
  { id: 2, label: "수익 모델", desc: "선호하는 수익 구조" },
  { id: 3, label: "타깃 시장", desc: "누구에게 팝니까?" },
  { id: 4, label: "해결할 문제", desc: "어떤 페인포인트를 공략?" },
  { id: 5, label: "실행 역량", desc: "팀과 예산 현황" },
  { id: 6, label: "최종 확인", desc: "아이디어 생성 시작" },
];

/* ── Dark card selector ── */
function CardSelect({ selected, onClick, label, desc, icon }: {
  selected: boolean; onClick: () => void; label: string; desc?: string; icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-3 text-left transition-all"
      style={
        selected
          ? {
              background: "rgba(79,110,247,0.12)",
              border: "1px solid rgba(79,110,247,0.35)",
            }
          : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }
      }
    >
      {icon ? <span className="text-lg">{icon}</span> : null}
      <p className="text-sm font-semibold" style={{ color: selected ? "#BAC8FF" : "#EDEEFF" }}>
        {label}
      </p>
      {desc ? (
        <p className="mt-0.5 text-xs" style={{ color: selected ? "#93AFFE" : "var(--ink-3)" }}>
          {desc}
        </p>
      ) : null}
    </button>
  );
}

/* ── Step indicator ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === current - 1 ? "2rem" : i < current ? "1.5rem" : "1rem",
            background: i < current ? "#FFFFFF" : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}

export default function IdeaMatchPage() {
  const router = useRouter();
  const { token, user, updateCredit } = useAuth();
  const [sessions, setSessions] = useState<IdeaMatchSessionListResponse["sessions"]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creditShortfall, setCreditShortfall] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [targetMarket, setTargetMarket] = useState("B2C");
  const [refStage, setRefStage] = useState("Seed");
  const [problemDesc, setProblemDesc] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [budget, setBudget] = useState("TEN_TO_30M");
  const [teamSize, setTeamSize] = useState("SOLO");
  const [skills, setSkills] = useState("");

  const creditBalance = user?.creditBalance ?? null;
  const hasCredits = creditBalance === null || creditBalance >= IDEA_MATCH_CREDIT_COST;

  const matchEstimate = selectedCategories.reduce((sum, cat) => {
    const found = INDUSTRY_CATEGORIES.find((c) => c.group === cat);
    return sum + (found?.count ?? 0);
  }, 0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api<IdeaMatchSessionListResponse>("GET", buildQuery("/api/idea-match/sessions", { limit: 6 }), undefined, token)
      .then((s) => { if (!cancelled) setSessions(s.sessions); })
      .catch((e) => { if (!cancelled) setError(readError(e, "데이터를 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function toggle(arr: string[], set: (v: string[]) => void, item: string) {
    set(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  function canProceed(): boolean {
    if (step === 1) return selectedCategories.length > 0;
    return true;
  }

  async function handleSubmit() {
    if (!token || !hasCredits) return;
    setSubmitting(true);
    setError("");

    const industries = selectedCategories.flatMap(
      (cat) => INDUSTRY_CATEGORIES.find((c) => c.group === cat)?.items ?? [],
    );
    const keywords = [
      ...industries,
      ...selectedModels.map((m) => REVENUE_MODELS.find((r) => r.value === m)?.label ?? m),
      problemDesc,
      targetCustomer,
    ].filter(Boolean).join(", ");

    try {
      const response = await api<IdeaMatchResponse>("POST", "/api/idea-match", {
        industries,
        problemKeywords: keywords,
        budgetRange: budget,
        teamSize,
        targetMarket,
        riskTolerance: "BALANCED",
        commitment: "FULL_TIME",
        launchTimeline: "SIX_MONTHS",
        technicalSkills: splitTags(skills),
        revenueModelPref: selectedModels,
        topK: 5,
      }, token);

      updateCredit(response.creditBalance);
      router.push(`/idea-match/results?sessionId=${response.sessionId}`);
    } catch (caught) {
      if (getCreditErrorDetails(caught)) {
        setCreditShortfall(true);
      } else {
        setError(readError(caught, "아이디어 생성에 실패했습니다."));
      }
      setStep(6);
    } finally {
      setSubmitting(false);
    }
  }

  function renderStep() {
    switch (step) {
      /* ── STEP 1: 산업 분야 ── */
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                어떤 산업에 관심 있나요?{" "}
                <span style={{ color: "#93AFFE" }}>*</span>
              </h2>
              <p style={{ color: "var(--ink-3)" }} className="text-sm">DB에서 관련 해외 사례를 우선 검색합니다 (복수 선택 가능)</p>
              {matchEstimate > 0 && (
                <span
                  className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6EE7B7" }}
                >
                  약 {matchEstimate}개 사례 매칭 예상
                </span>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {INDUSTRY_CATEGORIES.map((cat) => {
                const sel = selectedCategories.includes(cat.group);
                return (
                  <button
                    key={cat.group}
                    type="button"
                    onClick={() => toggle(selectedCategories, setSelectedCategories, cat.group)}
                    className="rounded-xl p-4 text-left transition-all"
                    style={
                      sel
                        ? { background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.35)" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: sel ? "#BAC8FF" : "#EDEEFF" }}>
                        {cat.group}
                      </p>
                      <span
                        className="rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold"
                        style={{ background: "rgba(255,255,255,0.06)", color: "var(--ink-3)" }}
                      >
                        {cat.count}건
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: sel ? "#93AFFE" : "var(--ink-4)" }}>
                      {cat.items.slice(0, 3).join(" · ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      /* ── STEP 2: 수익 모델 ── */
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">선호하는 수익 모델</h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                DB에서 해당 모델의 검증된 사례를 필터링합니다 (선택 안 해도 됩니다)
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {REVENUE_MODELS.map((model) => {
                const sel = selectedModels.includes(model.value);
                return (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => toggle(selectedModels, setSelectedModels, model.value)}
                    className="rounded-xl p-4 text-left transition-all"
                    style={
                      sel
                        ? { background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.35)" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    <p className="text-sm font-semibold" style={{ color: sel ? "#BAC8FF" : "#EDEEFF" }}>
                      {model.label}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>{model.desc}</p>
                    <p className="mt-2 text-[0.6875rem]" style={{ color: "var(--ink-4)" }}>DB {model.dbCount}건</p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      /* ── STEP 3: 타깃 시장 ── */
      case 3:
        return (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">벤치마크 & 타깃 시장</h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                어떤 단계의 해외 사례를 참고하고, 누구에게 팔 건가요?
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A8AACC" }}>참고할 해외 사례의 성장 단계</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FUNDING_STAGES.map((s) => (
                  <CardSelect key={s.value} selected={refStage === s.value} onClick={() => setRefStage(s.value)} label={s.label} desc={s.desc} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A8AACC" }}>한국 내 타깃 시장</p>
              <div className="grid grid-cols-3 gap-3">
                {TARGET_MARKETS.map((m) => (
                  <CardSelect key={m.value} selected={targetMarket === m.value} onClick={() => setTargetMarket(m.value)} label={m.label} desc={m.desc} icon={m.icon} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="targetCustomer" className="block text-sm font-semibold" style={{ color: "#A8AACC" }}>
                구체적인 타깃 고객
              </label>
              <input
                id="targetCustomer"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                className="input"
                placeholder="예: 직원 50명 이하 중소기업 HR 담당자, 20~30대 1인 가구"
              />
            </div>
          </div>
        );

      /* ── STEP 4: 해결할 문제 ── */
      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">해결하고 싶은 문제</h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                AI가 이 문제에 맞는 해외 솔루션을 매칭합니다 (선택 사항)
              </p>
            </div>
            <textarea
              value={problemDesc}
              onChange={(e) => setProblemDesc(e.target.value)}
              className="input min-h-[160px]"
              placeholder="해결하려는 문제를 구체적으로 적어주세요&#10;&#10;예: 소상공인이 재고 관리를 수기로 해서 폐기율이 15% 이상이다."
            />
            <p className="text-xs" style={{ color: "var(--ink-4)" }}>구체적일수록 더 정확한 아이디어가 생성됩니다</p>
          </div>
        );

      /* ── STEP 5: 실행 역량 ── */
      case 5:
        return (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">실행 역량</h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                팀 규모와 예산에 맞는 현실적인 아이디어를 제안합니다
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A8AACC" }}>팀 규모</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TEAM_OPTIONS.map((t) => (
                  <CardSelect key={t.value} selected={teamSize === t.value} onClick={() => setTeamSize(t.value)} label={t.label} icon={t.icon} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A8AACC" }}>초기 투자 예산</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudget(b.value)}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition-all"
                    style={
                      budget === b.value
                        ? { background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.35)", color: "#BAC8FF" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--ink-3)" }
                    }
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="skills" className="block text-sm font-semibold" style={{ color: "#A8AACC" }}>
                보유 기술/역량{" "}
                <span style={{ color: "var(--ink-4)" }}>(선택)</span>
              </label>
              <input
                id="skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="input"
                placeholder="예: React, Python, AI/ML, 마케팅, 도메인 전문지식"
              />
            </div>
          </div>
        );

      /* ── STEP 6: 최종 확인 ── */
      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">아이디어 생성 준비 완료</h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                선택한 조건으로 AI가 한국 맞춤 아이디어 5개를 생성합니다
              </p>
            </div>

            {/* Summary card */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <SummaryRow label="산업 분야">
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategories.length > 0
                    ? selectedCategories.map((c) => (
                        <span
                          key={c}
                          className="rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{ background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.2)", color: "#BAC8FF" }}
                        >
                          {c}
                        </span>
                      ))
                    : <span className="text-sm" style={{ color: "var(--ink-4)" }}>선택 없음</span>
                  }
                </div>
              </SummaryRow>
              <SummaryRow label="수익 모델">
                <div className="flex flex-wrap gap-1.5">
                  {selectedModels.length > 0
                    ? selectedModels.map((m) => (
                        <span
                          key={m}
                          className="rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.18)", color: "#6EE7B7" }}
                        >
                          {REVENUE_MODELS.find((r) => r.value === m)?.label}
                        </span>
                      ))
                    : <span className="text-sm" style={{ color: "var(--ink-4)" }}>미선택 (전체)</span>
                  }
                </div>
              </SummaryRow>
              <SummaryRow label="타깃">
                <span className="text-sm" style={{ color: "#A8AACC" }}>{targetMarket} · {refStage}</span>
              </SummaryRow>
              <SummaryRow label="팀/예산">
                <span className="text-sm" style={{ color: "#A8AACC" }}>
                  {TEAM_OPTIONS.find((t) => t.value === teamSize)?.label} · {BUDGET_OPTIONS.find((b) => b.value === budget)?.label}
                </span>
              </SummaryRow>
              {problemDesc && (
                <SummaryRow label="문제 정의">
                  <p className="text-sm line-clamp-2" style={{ color: "#A8AACC" }}>{problemDesc}</p>
                </SummaryRow>
              )}
              {matchEstimate > 0 && (
                <div
                  className="rounded-xl px-4 py-3 text-sm font-semibold"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.16)", color: "#6EE7B7" }}
                >
                  약 {matchEstimate}개 해외 사례 → 벡터 의미 검색 → 한국형 아이디어 생성
                </div>
              )}
            </div>

            {error && (
              <div
                className="rounded-xl p-4 text-sm"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#FCA5A5" }}
              >
                {error}
              </div>
            )}

            {(!hasCredits || creditShortfall) && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "#FCD34D" }}>
                  크레딧이 부족합니다 — 현재 {creditBalance}cr / 필요 {IDEA_MATCH_CREDIT_COST}cr
                </p>
                <Link
                  href="/billing"
                  className="inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #D97706, #F59E0B)" }}
                >
                  크레딧 충전하기 →
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !hasCredits || selectedCategories.length === 0}
              className="w-full rounded-md py-4 text-base font-semibold transition-colors"
              style={
                submitting || !hasCredits || selectedCategories.length === 0
                  ? { background: "rgba(255,255,255,0.08)", cursor: "not-allowed", color: "var(--ink-4)" }
                  : { background: "#FFFFFF", color: "#08080B" }
              }
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  DB 분석 중...
                </span>
              ) : (
                `아이디어 분석 시작 · ${IDEA_MATCH_CREDIT_COST} 크레딧`
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "var(--ink-4)" }}>
              잔여 크레딧: {user?.isAdmin ? "Unlimited" : creditBalance ?? 0}
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <AuthGuard>
      <div className="fade-up mx-auto max-w-2xl py-6">
        {/* Header */}
        <div className="mb-8 space-y-3 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: "rgba(79,110,247,0.1)", border: "1px solid rgba(79,110,247,0.22)" }}
          >
            <span className="text-sm font-bold" style={{ color: "#BAC8FF" }}>969개</span>
            <span className="text-sm" style={{ color: "#4F6EF7" }}>해외 성공 사례 실시간 분석</span>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            해외 성공 사례에서<br />
            <span className="gradient-text">내 아이디어를 찾다</span>
          </h1>
        </div>

        {/* Step indicator */}
        <div
          className="mb-8 flex items-center justify-between rounded-2xl px-5 py-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-4)" }}>
              Step {step} / {STEPS.length}
            </p>
            <p className="text-base font-bold text-white">{STEPS[step - 1].label}</p>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{STEPS[step - 1].desc}</p>
          </div>
          <StepIndicator current={step} total={STEPS.length} />
        </div>

        {/* Step content */}
        <div className="min-h-[380px]">{renderStep()}</div>

        {/* Navigation buttons */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-30"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#A8AACC",
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            이전
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => { if (!canProceed()) return; setStep((s) => s + 1); }}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-1.5 px-6 py-2.5 text-sm disabled:opacity-40 disabled:transform-none disabled:shadow-none"
            >
              다음
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* Previous sessions */}
        {!loading && sessions.length > 0 ? (
          <div
            className="mt-12 space-y-3 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h3 className="text-sm font-semibold text-white">이전 분석 결과</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {sessions.slice(0, 4).map((session) => {
                const ideaCount = session._count?.generatedIdeas ?? 0;
                const budgetLabel = budgetRangeOptions.find((o) => o.value === session.projectPolicy.budgetRange)?.label;
                const industries = (() => {
                  const raw = session.projectPolicy.industries;
                  if (Array.isArray(raw)) return (raw as string[]).slice(0, 2).join(" · ");
                  if (typeof raw === "string") return raw;
                  return null;
                })();
                const date = new Date(session.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
                return (
                  <Link
                    key={session.id}
                    href={`/idea-match/results?sessionId=${session.id}`}
                    className="group rounded-xl p-4 transition-all"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,110,247,0.25)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(79,110,247,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white leading-snug">
                        {session.projectPolicy.title}
                      </p>
                      <span className="shrink-0 text-[0.6875rem]" style={{ color: "var(--ink-4)" }}>{date}</span>
                    </div>
                    {industries ? (
                      <p className="mt-1 text-xs font-medium" style={{ color: "#93AFFE" }}>{industries}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-1 text-xs" style={{ color: "var(--ink-3)" }}>{session.searchQuery}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {ideaCount > 0 ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#6EE7B7" }}
                        >
                          {ideaCount} ideas
                        </span>
                      ) : null}
                      {budgetLabel ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[0.6875rem]"
                          style={{ background: "rgba(255,255,255,0.05)", color: "var(--ink-3)" }}
                        >
                          {budgetLabel}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 pt-0.5 text-xs font-semibold" style={{ color: "var(--ink-4)" }}>
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
