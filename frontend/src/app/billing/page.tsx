"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency, planLabels, readError } from "@/lib/product";
import type { PlanRecord } from "@/lib/types";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import MockTossModal from "@/components/MockTossModal";

const PLAN_FEATURES: Record<string, string[]> = {
  FREE:       ["매월 50 크레딧", "Discovery 검색", "케이스 잠금 해제", "Blueprint 생성"],
  STARTER:    ["매월 200 크레딧", "Discovery 검색", "케이스 잠금 해제", "Blueprint 생성"],
  PRO:        ["매월 600 크레딧", "모든 AI 기능 활용", "Idea Match 포함", "우선 지원"],
  TEAM:       ["매월 2,000 크레딧", "팀 협업 기능", "Slack/Discord 웹훅", "회의실 무제한"],
  ENTERPRISE: ["크레딧 맞춤 설정", "전담 지원 및 SLA", "커스텀 통합", "Admin 콘솔"],
};

export default function BillingPage() {
  const { token, user, refreshUser, updateCredit } = useAuth();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [clientKey, setClientKey] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [mockPlan, setMockPlan] = useState<PlanRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<PlanRecord[]>("GET", "/api/plans"),
      api<{ tossClientKey: string }>("GET", "/api/config/payment"),
    ])
      .then(([planData, paymentConfig]) => {
        if (!cancelled) {
          setPlans(planData);
          setClientKey(paymentConfig.tossClientKey);
        }
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "플랜 정보를 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // 🎬 관리자 데모 우회
  async function handleDemoSubscribe(plan: PlanRecord) {
    if (!token) return;
    setPendingPlan(plan.planType);
    setError(""); setMessage("");
    try {
      const response = await api<{ creditBalance: number; planType: string }>(
        "POST", "/api/admin/demo-subscribe", { planType: plan.planType }, token,
      );
      updateCredit(response.creditBalance);
      await refreshUser();
      setMessage(`🎬 데모 결제 완료 — ${planLabels[response.planType] || response.planType} 플랜 적용 (실거래 X)`);
    } catch (caught) {
      setError(readError(caught, "데모 결제에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  // FREE 플랜 다운그레이드 — 결제 없이 즉시 적용
  async function handleFreeSubscribe() {
    if (!token) return;
    setPendingPlan("FREE");
    setError("");
    setMessage("");
    try {
      const response = await api<{ creditBalance: number }>(
        "POST", "/api/subscribe", { planType: "FREE" }, token,
      );
      updateCredit(response.creditBalance);
      await refreshUser();
      setMessage("Free 플랜으로 변경되었습니다.");
    } catch (caught) {
      setError(readError(caught, "플랜 변경에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  // 유료 플랜 — Toss 결제창 열기
  async function handleTossPayment(plan: PlanRecord) {
    if (!token || !user) return;
    if (!clientKey) {
      setError("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setPendingPlan(plan.planType);
    setError("");
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `widea-${plan.planType.toLowerCase()}-${Date.now()}`;
      await tossPayments.requestPayment("카드", {
        amount: plan.price,
        orderId,
        orderName: `Widea ${plan.label} 구독`,
        customerName: user.name || user.email,
        successUrl: `${window.location.origin}/billing/success?planType=${plan.planType}`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch (caught: unknown) {
      // 사용자가 직접 창 닫은 경우 무시
      if (caught && typeof caught === "object" && "code" in caught && (caught as { code: string }).code === "USER_CANCEL") {
        setPendingPlan("");
        return;
      }
      setError(readError(caught, "결제 요청에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="구독·결제"
          title="구독 플랜 관리"
          description="현재 플랜을 확인하고 필요에 맞게 업그레이드하세요."
          badge={
            user ? (
              <span className="badge badge-accent">
                현재 {planLabels[user.planType] || user.planType}
              </span>
            ) : undefined
          }
          actions={
            <Link href="/billing/history" className="btn-secondary px-4 py-2 text-sm">
              크레딧 이력
            </Link>
          }
        />

        {message ? (
          <Surface className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{message}</Surface>
        ) : null}
        {error ? (
          <Surface className="border-rose-500/30 bg-rose-500/10 text-rose-300">{error}</Surface>
        ) : null}

        {/* 현재 상태 요약 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Surface className="space-y-1">
            <p className="eyebrow">현재 플랜</p>
            <p className="text-3xl font-bold text-white">
              {user ? planLabels[user.planType] || user.planType : "-"}
            </p>
          </Surface>
          <Surface className="space-y-1 surface-card-accent">
            <p className="eyebrow">크레딧 잔액</p>
            <p className="text-3xl font-bold text-white">
              {user?.isAdmin ? "∞" : (user?.creditBalance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500">크레딧 잔액</p>
          </Surface>
          <Surface className="space-y-1">
            <p className="eyebrow">기능별 차감 크레딧</p>
            <ul className="mt-1 space-y-0.5 text-xs text-zinc-400">
              <li>Discovery 검색 — 1 cr</li>
              <li>케이스 잠금 해제 — 2 cr</li>
              <li>Blueprint 생성 — 5 cr</li>
              <li>Idea Match — 10 cr</li>
            </ul>
          </Surface>
        </div>

        {/* 플랜 카드 */}
        <Surface className="space-y-5">
          <div>
            <p className="eyebrow">구독 플랜</p>
            <h2 className="text-xl font-semibold text-white">플랜 선택</h2>
            <p className="mt-1 text-sm text-zinc-400">
              구독을 변경하면 토스 결제창이 뜨고 승인 후 즉시 크레딧이 충전됩니다.
            </p>
          </div>

          {loading ? (
            <LoadingState label="플랜 정보를 불러오는 중..." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {plans.map((plan) => {
                const isCurrent = user?.planType === plan.planType;
                const isRecommended = plan.planType === "PRO";
                const features = PLAN_FEATURES[plan.planType] ?? [];

                return (
                  <div
                    key={plan.planType}
                    className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-colors ${
                      isCurrent
                        ? "border-indigo-400/50 bg-indigo-500/10 ring-1 ring-indigo-400/30"
                        : isRecommended
                          ? "border-indigo-400/30 bg-white/[0.04] hover:border-indigo-400/50"
                          : "border-white/10 bg-white/[0.04] hover:border-indigo-400/30"
                    }`}
                  >
                    {(isCurrent || isRecommended) ? (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white shadow ${
                        isCurrent ? "bg-zinc-700" : "bg-indigo-500"
                      }`}>
                        {isCurrent ? "현재 플랜" : "Recommended"}
                      </span>
                    ) : null}

                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-bold text-white">{plan.label}</p>
                        <p className="mt-1 text-2xl font-bold text-white">
                          {plan.price === 0 ? "무료" : formatCurrency(plan.price)}
                          {plan.price > 0 ? (
                            <span className="text-sm font-normal text-zinc-500">/월</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-400">
                          매월 {plan.credits.toLocaleString()} cr
                        </p>
                      </div>

                      <ul className="space-y-1.5">
                        {features.map((feat) => (
                          <li key={feat} className="flex items-start gap-1.5 text-xs text-zinc-300">
                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 space-y-2">
                      {token ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              plan.price === 0
                                ? handleFreeSubscribe()
                                : handleTossPayment(plan)
                            }
                            disabled={pendingPlan === plan.planType || isCurrent}
                            className={`w-full ${isCurrent ? "btn-secondary" : "btn-primary"} disabled:opacity-50`}
                          >
                            {isCurrent
                              ? "현재 플랜"
                              : pendingPlan === plan.planType
                                ? "처리 중..."
                                : plan.price === 0
                                  ? "무료로 시작"
                                  : `${plan.label} 결제하기`}
                          </button>
                          {user?.isAdmin && plan.price > 0 && !isCurrent ? (
                            <button
                              type="button"
                              onClick={() => { setMockPlan(plan); setMockOpen(true); }}
                              disabled={pendingPlan === plan.planType}
                              className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                              title="관리자 전용 — Toss 스타일 데모 결제"
                            >
                              🎬 데모 결제 (실거래 X)
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <Link href="/register" className="btn-primary block w-full text-center">
                          가입하기
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        {/* 크레딧 이력 바로가기 */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-white">크레딧 사용 이력</p>
            <p className="text-xs text-zinc-400">AI 기능 사용 내역과 충전 이력을 확인할 수 있습니다.</p>
          </div>
          <Link href="/billing/history" className="btn-secondary px-4 py-2 text-sm">
            이력 보기 →
          </Link>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          ⓘ 결제는 토스페이먼츠 테스트 환경으로 처리되며 실제 카드 청구는 발생하지 않습니다.
        </p>

        {mockPlan ? (
          <MockTossModal
            open={mockOpen}
            planLabel={mockPlan.label}
            amountKRW={mockPlan.price}
            onClose={() => setMockOpen(false)}
            onConfirm={async () => {
              await handleDemoSubscribe(mockPlan);
            }}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}
