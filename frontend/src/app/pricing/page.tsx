"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency, planLabels, readError } from "@/lib/product";
import type { PlanRecord } from "@/lib/types";

export default function PricingPage() {
  const { token, user, refreshUser, updateCredit } = useAuth();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api<PlanRecord[]>("GET", "/api/plans")
      .then((data) => {
        if (!cancelled) setPlans(data);
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "플랜 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe(planType: string) {
    if (!token) return;

    setPendingPlan(planType);
    setError("");
    setMessage("");

    try {
      const response = await api<{ creditBalance: number }>(
        "POST",
        "/api/subscribe",
        { planType },
        token,
      );

      updateCredit(response.creditBalance);
      await refreshUser();
      setMessage(`${planLabels[planType] || planType} 플랜이 적용되었습니다.`);
    } catch (caught) {
      setError(readError(caught, "플랜 변경에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  return (
    <div className="workspace-grid fade-up">
      <PageHeader
        eyebrow="Pricing"
        title="팀의 실행 속도에 맞는 플랜"
        description="무료 탐색부터 팀 단위 운영까지, 크레딧과 실행량에 맞춰 플랜을 확장할 수 있습니다."
        badge={user ? <span className="badge badge-accent">현재 {planLabels[user.planType] || user.planType}</span> : undefined}
      />

      {message ? (
        <Surface className="border-[rgba(29,143,92,0.18)] bg-[rgba(236,248,241,0.88)] text-[rgb(29,116,75)]">
          {message}
        </Surface>
      ) : null}
      {error ? (
        <Surface className="border-red-100 bg-red-50 text-red-700">
          {error}
        </Surface>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Surface key={index} className="min-h-[320px]">
                <div />
              </Surface>
            ))
          : plans.map((plan) => {
              const isCurrent = user?.planType === plan.planType;
              const isRecommended = plan.planType === "PRO";
              return (
                <Surface
                  key={plan.planType}
                  className={`flex h-full flex-col justify-between space-y-5 ${
                    isRecommended ? "surface-card-accent" : ""
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">{plan.planType === "FREE" ? "Starter mode" : "Scale mode"}</p>
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {plan.label}
                        </h2>
                      </div>
                      {isRecommended ? <span className="badge badge-warning">Recommended</span> : null}
                    </div>
                    <div>
                      <p className="text-3xl font-semibold tracking-[-0.05em] text-gray-900">
                        {plan.price === 0 ? "무료" : formatCurrency(plan.price)}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        매월 {plan.credits.toLocaleString("ko-KR")} credits
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {[
                        `${plan.credits.toLocaleString("ko-KR")} credits 지급`,
                        "Discovery, Blueprint, Idea Match 즉시 사용",
                        plan.planType === "TEAM"
                          ? "운영용으로 넉넉한 사용량"
                          : plan.planType === "ENTERPRISE"
                            ? "대규모 탐색과 검증에 적합"
                            : "소규모 팀과 개인 검증에 적합",
                      ].map((line) => (
                        <div
                          key={line}
                          className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {token ? (
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.planType)}
                      disabled={pendingPlan === plan.planType || isCurrent}
                      className={isCurrent ? "btn-secondary w-full" : "btn-primary w-full"}
                    >
                      {isCurrent
                        ? "현재 플랜"
                        : pendingPlan === plan.planType
                          ? "적용 중..."
                          : `${plan.label} 적용`}
                    </button>
                  ) : (
                    <Link href="/register" className="btn-primary w-full">
                      가입하고 시작하기
                    </Link>
                  )}
                </Surface>
              );
            })}
      </div>
    </div>
  );
}
