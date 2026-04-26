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
  { value: "FOUR_TO_TEN", label: "4~10인", icon: "👥👥" },
  { value: "OVER_TEN", label: "10인+", icon: "🏢" },
];

/* ── Step 정의 ── */
const STEPS = [
  { id: 1, label: "산업 분야", desc: "어떤 분야에 관심 있나요?" },
  { id: 2, label: "수익 모델", desc: "선호하는 수익 구조" },
  { id: 3, label: "타깃 시장", desc: "누구에게 팝니까?" },
  { id: 4, label: "해결할 문제", desc: "어떤 페인포인트를 공략?" },
  { id: 5, label: "실행 역량", desc: "팀과 예산 현황" },
  { id: 6, label: "최종 확인", desc: "아이디어 생성 시작" },
];

/* ── 작은 공통 컴포넌트 ── */
function CardSelect({ selected, onClick, label, desc, icon }: {
  selected: boolean; onClick: () => void; label: string; desc?: string; icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-3 text-left transition-all ${
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {icon ? <span className="text-lg">{icon}</span> : null}
      <p className={`text-sm font-semibold ${selected ? "text-blue-800" : "text-gray-900"}`}>{label}</p>
      {desc ? <p className={`mt-0.5 text-xs ${selected ? "text-blue-600" : "text-gray-500"}`}>{desc}</p> : null}
    </button>
  );
}

/* ── 스텝 인디케이터 ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? "bg-blue-600 w-6"
              : i === current - 1
              ? "bg-blue-500 w-8"
              : "bg-gray-200 w-4"
          }`}
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

  /* ── 스텝 상태 ── */
  const [step, setStep] = useState(1);

  /* ── 설문 상태 ── */
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

  /* ── 각 스텝 렌더 ── */
  function renderStep() {
    switch (step) {
      /* ── STEP 1: 산업 분야 ── */
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900">
                어떤 산업에 관심 있나요? <span className="text-blue-600">*</span>
              </h2>
              <p className="text-gray-500">DB에서 관련 해외 사례를 우선 검색합니다 (복수 선택 가능)</p>
              {matchEstimate > 0 && (
                <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
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
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      sel ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${sel ? "text-blue-800" : "text-gray-900"}`}>{cat.group}</p>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-gray-500">
                        {cat.count}건
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{cat.items.slice(0, 3).join(" · ")}</p>
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
              <h2 className="text-2xl font-bold text-gray-900">선호하는 수익 모델</h2>
              <p className="text-gray-500">DB에서 해당 모델의 검증된 사례를 필터링합니다 (선택 안 해도 됩니다)</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {REVENUE_MODELS.map((model) => {
                const sel = selectedModels.includes(model.value);
                return (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => toggle(selectedModels, setSelectedModels, model.value)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      sel ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${sel ? "text-blue-800" : "text-gray-900"}`}>{model.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{model.desc}</p>
                    <p className="mt-2 text-[0.6875rem] text-gray-400">DB {model.dbCount}건</p>
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
              <h2 className="text-2xl font-bold text-gray-900">벤치마크 & 타깃 시장</h2>
              <p className="text-gray-500">어떤 단계의 해외 사례를 참고하고, 누구에게 팔 건가요?</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">참고할 해외 사례의 성장 단계</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FUNDING_STAGES.map((s) => (
                  <CardSelect key={s.value} selected={refStage === s.value} onClick={() => setRefStage(s.value)} label={s.label} desc={s.desc} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">한국 내 타깃 시장</p>
              <div className="grid grid-cols-3 gap-3">
                {TARGET_MARKETS.map((m) => (
                  <CardSelect key={m.value} selected={targetMarket === m.value} onClick={() => setTargetMarket(m.value)} label={m.label} desc={m.desc} icon={m.icon} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="targetCustomer" className="block text-sm font-semibold text-gray-700">
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
              <h2 className="text-2xl font-bold text-gray-900">해결하고 싶은 문제</h2>
              <p className="text-gray-500">AI가 이 문제에 맞는 해외 솔루션을 매칭합니다 (선택 사항)</p>
            </div>
            <textarea
              value={problemDesc}
              onChange={(e) => setProblemDesc(e.target.value)}
              className="input min-h-[160px]"
              placeholder="해결하려는 문제를 구체적으로 적어주세요&#10;&#10;예: 소상공인이 재고 관리를 수기로 해서 폐기율이 15% 이상이다. 자동 발주 시스템이 없어서 과잉/부족 발주가 반복된다."
            />
            <p className="text-xs text-gray-400">구체적일수록 더 정확한 아이디어가 생성됩니다</p>
          </div>
        );

      /* ── STEP 5: 실행 역량 ── */
      case 5:
        return (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900">실행 역량</h2>
              <p className="text-gray-500">팀 규모와 예산에 맞는 현실적인 아이디어를 제안합니다</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">팀 규모</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TEAM_OPTIONS.map((t) => (
                  <CardSelect key={t.value} selected={teamSize === t.value} onClick={() => setTeamSize(t.value)} label={t.label} icon={t.icon} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">초기 투자 예산</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudget(b.value)}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                      budget === b.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="skills" className="block text-sm font-semibold text-gray-700">
                보유 기술/역량 <span className="font-normal text-gray-400">(선택)</span>
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
              <h2 className="text-2xl font-bold text-gray-900">아이디어 생성 준비 완료</h2>
              <p className="text-gray-500">선택한 조건으로 AI가 한국 맞춤 아이디어 5개를 생성합니다</p>
            </div>

            {/* 요약 카드 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <SummaryRow label="산업 분야">
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategories.length > 0
                    ? selectedCategories.map((c) => (
                        <span key={c} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{c}</span>
                      ))
                    : <span className="text-sm text-gray-400">선택 없음</span>
                  }
                </div>
              </SummaryRow>
              <SummaryRow label="수익 모델">
                <div className="flex flex-wrap gap-1.5">
                  {selectedModels.length > 0
                    ? selectedModels.map((m) => (
                        <span key={m} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {REVENUE_MODELS.find((r) => r.value === m)?.label}
                        </span>
                      ))
                    : <span className="text-sm text-gray-400">미선택 (전체)</span>
                  }
                </div>
              </SummaryRow>
              <SummaryRow label="타깃">
                <span className="text-sm text-gray-700">{targetMarket} · {refStage}</span>
              </SummaryRow>
              <SummaryRow label="팀/예산">
                <span className="text-sm text-gray-700">
                  {TEAM_OPTIONS.find((t) => t.value === teamSize)?.label} · {BUDGET_OPTIONS.find((b) => b.value === budget)?.label}
                </span>
              </SummaryRow>
              {problemDesc && (
                <SummaryRow label="문제 정의">
                  <p className="text-sm text-gray-700 line-clamp-2">{problemDesc}</p>
                </SummaryRow>
              )}
              {matchEstimate > 0 && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  약 {matchEstimate}개 해외 사례 → Pinecone 벡터 검색 → AI 분석
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {(!hasCredits || creditShortfall) && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">
                  크레딧이 부족합니다 — 현재 {creditBalance}cr / 필요 {IDEA_MATCH_CREDIT_COST}cr
                </p>
                <Link href="/billing" className="inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                  크레딧 충전하기 →
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !hasCredits || selectedCategories.length === 0}
              className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300"
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

            <p className="text-center text-xs text-gray-400">잔여 크레딧: {user?.isAdmin ? "Unlimited" : creditBalance ?? 0}</p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <AuthGuard>
      <div className="fade-up mx-auto max-w-2xl py-6">
        {/* 헤더 */}
        <div className="mb-8 space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5">
            <span className="text-sm font-bold text-blue-700">969개</span>
            <span className="text-sm text-blue-600">해외 성공 사례 실시간 분석</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            해외 성공 사례에서<br />내 아이디어를 찾다
          </h1>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Step {step} / {STEPS.length}
            </p>
            <p className="text-base font-bold text-gray-900">{STEPS[step - 1].label}</p>
          </div>
          <StepIndicator current={step} total={STEPS.length} />
        </div>

        {/* 스텝 컨텐츠 */}
        <div className="min-h-[380px]">
          {renderStep()}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            이전
          </button>

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => {
                if (!canProceed()) return;
                setStep((s) => s + 1);
              }}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            >
              다음
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* 이전 세션 */}
        {!loading && sessions.length > 0 ? (
          <div className="mt-12 space-y-3 border-t border-gray-100 pt-8">
            <h3 className="text-sm font-semibold text-gray-900">이전 분석 결과</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {sessions.slice(0, 4).map((session) => {
                const ideaCount = session._count?.generatedIdeas ?? 0;
                const budget = budgetRangeOptions.find((o) => o.value === session.projectPolicy.budgetRange)?.label;
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
                    className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 leading-snug">{session.projectPolicy.title}</p>
                      <span className="shrink-0 text-[0.6875rem] text-gray-400">{date}</span>
                    </div>
                    {industries ? (
                      <p className="mt-1 text-xs text-blue-600 font-medium">{industries}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">{session.searchQuery}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {ideaCount > 0 ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-emerald-700">
                          {ideaCount} ideas
                        </span>
                      ) : null}
                      {budget ? (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.6875rem] text-gray-500">
                          {budget}
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
      <span className="w-20 shrink-0 text-xs font-semibold text-gray-400 pt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
