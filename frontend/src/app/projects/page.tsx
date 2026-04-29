"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, getProjectWorkflowState, readError } from "@/lib/product";
import type { ProjectListResponse, ProjectSummary } from "@/lib/types";

// ── 설문 옵션 데이터 ──────────────────────────────────────────────

const BUDGET_RANGE_OPTIONS = [
  { value: "UNDER_5M", label: "500만원 미만" },
  { value: "FIVE_TO_10M", label: "500만 ~ 1,000만원" },
  { value: "TEN_TO_30M", label: "1,000만 ~ 3,000만원" },
  { value: "THIRTY_TO_50M", label: "3,000만 ~ 5,000만원" },
  { value: "FIFTY_TO_100M", label: "5,000만 ~ 1억원" },
  { value: "OVER_100M", label: "1억원 이상" },
];

const COMMITMENT_OPTIONS = [
  { value: "FULL_TIME", label: "풀타임 (하루 8시간+)" },
  { value: "PART_TIME", label: "파트타임 (하루 4시간 내외)" },
  { value: "SIDE_PROJECT", label: "사이드 (퇴근 후 / 주말)" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "SOLO", label: "혼자" },
  { value: "TWO_TO_THREE", label: "2~3명" },
  { value: "FOUR_TO_TEN", label: "4~10명" },
  { value: "OVER_TEN", label: "10명 이상" },
];

const TARGET_MARKET_OPTIONS = [
  { value: "B2C", label: "B2C — 일반 소비자" },
  { value: "B2B", label: "B2B — 기업/사업자" },
  { value: "B2B2C", label: "B2B2C — 기업 통해 소비자" },
];

const INDUSTRY_OPTIONS = [
  "FinTech", "HealthTech", "EdTech", "AgTech", "LegalTech",
  "PropTech", "HRTech", "LogisticsTech", "FoodTech", "RetailTech",
  "TravelTech", "Marketplace", "AI/ML", "SaaS", "Manufacturing",
  "PetTech", "BeautyTech", "FitnessTech", "CreatorEconomy", "CleanTech",
];

const TECHNICAL_SKILL_OPTIONS = [
  "개발 (웹/앱)", "AI/ML 개발", "데이터 분석", "디자인/UX",
  "마케팅/광고", "영업/BD", "재무/회계", "법무/특허",
  "제조/생산", "물류/운영", "의료/바이오", "교육",
];

const RISK_TOLERANCE_OPTIONS = [
  { value: "CONSERVATIVE", label: "안정적 — 검증된 모델 선호" },
  { value: "BALANCED", label: "균형 — 적당한 도전 OK" },
  { value: "AGGRESSIVE", label: "공격적 — 큰 리스크 감수 가능" },
];

// ── 타입 ──────────────────────────────────────────────────────────

type WizardForm = {
  // Step 1 — 내가 뭘 잘하나?
  currentJob: string;
  technicalSkills: string[];
  // Step 2 — 자원
  budgetRange: string;
  commitment: string;
  teamSize: string;
  // Step 3 — 방향
  targetMarket: string;
  industries: string[];
  // Step 4 — 어떤 문제?
  problemKeywords: string;
  // Step 5 — 리스크 / 기간
  riskTolerance: string;
  launchTimeline: string;
  // Step 6 — 프로젝트 이름
  title: string;
};

const INITIAL_FORM: WizardForm = {
  currentJob: "",
  technicalSkills: [],
  budgetRange: "",
  commitment: "",
  teamSize: "",
  targetMarket: "B2C",
  industries: [],
  problemKeywords: "",
  riskTolerance: "BALANCED",
  launchTimeline: "SIX_MONTHS",
  title: "",
};

const STEPS = [
  { key: "skills", label: "내 강점" },
  { key: "resources", label: "자원" },
  { key: "direction", label: "방향" },
  { key: "problem", label: "문제" },
  { key: "risk", label: "리스크" },
  { key: "confirm", label: "완료" },
];

// ── 헬퍼 ──────────────────────────────────────────────────────────

function toggleArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function ChipButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function RadioCard({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api<ProjectListResponse>("GET", "/api/projects", undefined, token)
      .then((data) => { if (!cancelled) setProjects(data.projects); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로젝트 목록을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function set<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canNext(): boolean {
    if (step === 0) return form.currentJob.trim().length > 0;
    if (step === 1) return Boolean(form.budgetRange && form.commitment && form.teamSize);
    if (step === 2) return Boolean(form.targetMarket && form.industries.length > 0);
    if (step === 3) return form.problemKeywords.trim().length > 10;
    if (step === 4) return Boolean(form.riskTolerance && form.launchTimeline);
    if (step === 5) return form.title.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await api<ProjectSummary>("POST", "/api/projects", {
        title: form.title.trim(),
        targetMarket: form.targetMarket,
        currentJob: form.currentJob,
        technicalSkills: form.technicalSkills,
        budgetRange: form.budgetRange,
        commitment: form.commitment,
        teamSize: form.teamSize,
        industries: form.industries,
        problemKeywords: form.problemKeywords,
        riskTolerance: form.riskTolerance,
        launchTimeline: form.launchTimeline,
      }, token);
      setProjects((prev) => [created, ...prev]);
      setShowWizard(false);
      setStep(0);
      setForm(INITIAL_FORM);
    } catch (caught) {
      setError(readError(caught, "프로젝트 생성에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!token) return;
    const confirmed = window.confirm("이 프로젝트를 삭제할까요?");
    if (!confirmed) return;
    try {
      await api("DELETE", `/api/projects/${projectId}`, undefined, token);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (caught) {
      setError(readError(caught, "프로젝트 삭제에 실패했습니다."));
    }
  }

  // ── 마법사 렌더 ────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Step 1 — 내 강점</p>
              <h2 className="text-xl font-bold text-gray-900">현재 직업이 뭔가요?</h2>
              <p className="mt-1 text-sm text-gray-500">AI가 나에게 맞는 아이디어를 찾는 데 가장 중요한 정보입니다.</p>
            </div>
            <input
              className="input"
              placeholder="예: 개발자, 간호사, 마케터, 자영업자, 프리랜서 디자이너..."
              value={form.currentJob}
              onChange={(e) => set("currentJob", e.target.value)}
            />
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">보유 역량 (복수 선택)</p>
              <div className="flex flex-wrap gap-2">
                {TECHNICAL_SKILL_OPTIONS.map((skill) => (
                  <ChipButton
                    key={skill}
                    label={skill}
                    active={form.technicalSkills.includes(skill)}
                    onClick={() => set("technicalSkills", toggleArray(form.technicalSkills, skill))}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Step 2 — 자원</p>
              <h2 className="text-xl font-bold text-gray-900">얼마나 쏟을 수 있어요?</h2>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">투자 가능 예산</p>
              <div className="grid gap-2">
                {BUDGET_RANGE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.budgetRange === opt.value}
                    onClick={() => set("budgetRange", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">시간 투자 수준</p>
              <div className="grid gap-2">
                {COMMITMENT_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.commitment === opt.value}
                    onClick={() => set("commitment", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">팀 규모</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {TEAM_SIZE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.teamSize === opt.value}
                    onClick={() => set("teamSize", opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Step 3 — 방향</p>
              <h2 className="text-xl font-bold text-gray-900">누구한테 팔고 싶어요?</h2>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">타겟 고객</p>
              <div className="grid gap-2">
                {TARGET_MARKET_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.targetMarket === opt.value}
                    onClick={() => set("targetMarket", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">관심 산업 (복수 선택, 최소 1개)</p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((ind) => (
                  <ChipButton
                    key={ind}
                    label={ind}
                    active={form.industries.includes(ind)}
                    onClick={() => set("industries", toggleArray(form.industries, ind))}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Step 4 — 문제</p>
              <h2 className="text-xl font-bold text-gray-900">어떤 문제를 해결하고 싶어요?</h2>
              <p className="mt-1 text-sm text-gray-500">직접 겪었거나, 주변에서 자주 보이는 불편함이면 더 좋아요.</p>
            </div>
            <textarea
              className="textarea min-h-[140px]"
              placeholder="예: 소규모 식당 사장님들이 재고 관리를 아직도 엑셀로 하고 있어요. 실수가 잦고 시간도 너무 많이 들고..."
              value={form.problemKeywords}
              onChange={(e) => set("problemKeywords", e.target.value)}
            />
            <p className="text-xs text-gray-400">{form.problemKeywords.length}자 (최소 10자)</p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Step 5 — 리스크 & 기간</p>
              <h2 className="text-xl font-bold text-gray-900">어느 정도 도전할 수 있어요?</h2>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">리스크 성향</p>
              <div className="grid gap-2">
                {RISK_TOLERANCE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.riskTolerance === opt.value}
                    onClick={() => set("riskTolerance", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">목표 런칭 타임라인</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "ONE_MONTH", label: "1개월 이내" },
                  { value: "THREE_MONTHS", label: "3개월 이내" },
                  { value: "SIX_MONTHS", label: "6개월 이내" },
                  { value: "ONE_YEAR", label: "1년 이내" },
                  { value: "OVER_ONE_YEAR", label: "1년 이상" },
                ].map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.launchTimeline === opt.value}
                    onClick={() => set("launchTimeline", opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Step 6 — 완료</p>
              <h2 className="text-xl font-bold text-gray-900">이 프로젝트 이름을 지어주세요</h2>
              <p className="mt-1 text-sm text-gray-500">나중에 여러 프로젝트를 구분하는 데 쓰입니다.</p>
            </div>
            <input
              className="input"
              placeholder="예: 소상공인 재고관리 SaaS, 반려동물 원격진료 앱..."
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">입력 요약</p>
              <p className="text-sm text-gray-700"><span className="text-gray-400">직업</span> {form.currentJob}</p>
              <p className="text-sm text-gray-700"><span className="text-gray-400">예산</span> {BUDGET_RANGE_OPTIONS.find(o => o.value === form.budgetRange)?.label}</p>
              <p className="text-sm text-gray-700"><span className="text-gray-400">시간</span> {COMMITMENT_OPTIONS.find(o => o.value === form.commitment)?.label}</p>
              <p className="text-sm text-gray-700"><span className="text-gray-400">팀</span> {TEAM_SIZE_OPTIONS.find(o => o.value === form.teamSize)?.label}</p>
              <p className="text-sm text-gray-700"><span className="text-gray-400">타겟</span> {form.targetMarket}</p>
              <p className="text-sm text-gray-700"><span className="text-gray-400">산업</span> {form.industries.join(", ")}</p>
              <p className="text-sm text-gray-700 line-clamp-2"><span className="text-gray-400">문제</span> {form.problemKeywords}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="프로젝트 워크스페이스"
          title="프로젝트"
          description="설문을 작성하면 AI가 나에게 맞는 창업 아이디어를 찾아드립니다."
        />

        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">{error}</Surface>
        ) : null}

        {/* 새 프로젝트 버튼 */}
        {!showWizard ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setShowWizard(true); setStep(0); setForm(INITIAL_FORM); }}
              className="btn-primary"
            >
              + 새 프로젝트 만들기
            </button>
          </div>
        ) : null}

        {/* 설문 마법사 */}
        {showWizard ? (
          <Surface className="space-y-6">
            {/* 진행 바 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                {STEPS.map((s, i) => (
                  <span key={s.key} className={i === step ? "font-semibold text-blue-600" : ""}>{s.label}</span>
                ))}
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {renderStep()}

            {/* 네비게이션 */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => step === 0 ? (setShowWizard(false)) : setStep((s) => s - 1)}
                className="btn-ghost px-4 py-2 text-sm"
              >
                {step === 0 ? "취소" : "이전"}
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-primary disabled:opacity-40"
                >
                  다음
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canNext() || submitting}
                  onClick={handleSubmit}
                  className="btn-primary disabled:opacity-40"
                >
                  {submitting ? "생성 중..." : "아이디어 찾기 시작"}
                </button>
              )}
            </div>
          </Surface>
        ) : null}

        {/* 프로젝트 목록 */}
        {loading ? (
          <LoadingState label="프로젝트 목록을 준비하는 중입니다..." />
        ) : projects.length === 0 && !showWizard ? (
          <EmptyState
            title="아직 프로젝트가 없습니다"
            description="설문을 작성하면 AI가 나에게 맞는 창업 아이디어를 찾아드립니다."
            action={
              <button type="button" className="btn-primary" onClick={() => setShowWizard(true)}>
                첫 프로젝트 만들기
              </button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => {
              const workflow = getProjectWorkflowState({
                projectId: project.id,
                blueprintCount: project.blueprintCount,
                ideaSessionCount: project.ideaSessionCount,
              });
              return (
                <div key={project.id} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                        <span className="badge badge-accent">{workflow.stageLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {project.targetMarket} · {formatCurrency(project.budgetLimit)} · {formatDate(project.createdAt)}
                      </p>
                    </div>
                    <span className="badge badge-neutral">Progress {workflow.completionPercent}%</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/projects/${project.id}`} className="btn-primary px-4 py-2 text-sm">
                      워크스페이스 열기
                    </Link>
                    <Link href={workflow.nextAction.href} className="btn-secondary px-4 py-2 text-sm">
                      {workflow.nextAction.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(project.id)}
                      className="btn-ghost px-4 py-2 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
