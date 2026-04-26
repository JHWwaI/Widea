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
          eyebrow="Billing"
          title="구독 플랜 관리"
          description="현재 플랜을 확인하고 필요에 맞게 업그레이드하세요."
          badge={
            user ? (
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
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
          <Surface className="border-emerald-100 bg-emerald-50 text-emerald-700">{message}</Surface>
        ) : null}
        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">{error}</Surface>
        ) : null}

        {/* 현재 상태 요약 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Surface className="space-y-1">
            <p className="eyebrow">Current plan</p>
            <p className="text-3xl font-bold text-gray-900">
              {user ? planLabels[user.planType] || user.planType : "-"}
            </p>
          </Surface>
          <Surface className="space-y-1 surface-card-accent">
            <p className="eyebrow">Credit balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {user?.isAdmin ? "∞" : (user?.creditBalance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">크레딧 잔액</p>
          </Surface>
          <Surface className="space-y-1">
            <p className="eyebrow">Credit costs</p>
            <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
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
            <p className="eyebrow">Plans</p>
            <h2 className="text-xl font-semibold text-gray-900">플랜 선택</h2>
            <p className="mt-1 text-sm text-gray-500">
              구독을 변경하면 즉시 적용되고 새 크레딧이 충전됩니다.
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
                    className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-shadow hover:shadow-md ${
                      isCurrent
                        ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
                        : isRecommended
                          ? "border-blue-200 bg-white"
                          : "border-gray-100 bg-white"
                    }`}
                  >
                    {(isCurrent || isRecommended) ? (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white shadow ${
                        isCurrent ? "bg-gray-800" : "bg-blue-600"
                      }`}>
                        {isCurrent ? "현재 플랜" : "Recommended"}
                      </span>
                    ) : null}

                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{plan.label}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {plan.price === 0 ? "무료" : formatCurrency(plan.price)}
                          {plan.price > 0 ? (
                            <span className="text-sm font-normal text-gray-400">/월</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500">
                          매월 {plan.credits.toLocaleString()} cr
                        </p>
                      </div>

                      <ul className="space-y-1.5">
                        {features.map((feat) => (
                          <li key={feat} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5">
                      {token ? (
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
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">크레딧 사용 이력</p>
            <p className="text-xs text-gray-500">AI 기능 사용 내역과 충전 이력을 확인할 수 있습니다.</p>
          </div>
          <Link href="/billing/history" className="btn-secondary px-4 py-2 text-sm">
            이력 보기 →
          </Link>
        </div>
      </div>
    </AuthGuard>
  );
}
