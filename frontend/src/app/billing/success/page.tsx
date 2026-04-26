"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { planLabels, readError } from "@/lib/product";

type ConfirmResult = {
  planType: string;
  creditsGranted: number;
  creditBalance: number;
};

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, refreshUser, updateCredit } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const paymentKey = searchParams.get("paymentKey");
    const orderId    = searchParams.get("orderId");
    const amount     = searchParams.get("amount");
    const planType   = searchParams.get("planType");

    if (!paymentKey || !orderId || !amount || !planType) {
      setError("결제 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }
    if (!token) {
      setError("로그인이 필요합니다.");
      setStatus("error");
      return;
    }

    api<ConfirmResult>(
      "POST",
      "/api/payment/toss/confirm",
      { paymentKey, orderId, amount: Number(amount), planType },
      token,
    )
      .then(async (data) => {
        updateCredit(data.creditBalance);
        await refreshUser();
        setResult(data);
        setStatus("success");
      })
      .catch((caught) => {
        setError(readError(caught, "결제 승인에 실패했습니다."));
        setStatus("error");
      });
  }, [searchParams, token, refreshUser, updateCredit]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
          <span className="text-sm text-gray-500">결제를 확인하는 중입니다...</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">결제 확인 실패</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/billing")}
            className="btn-primary w-full"
          >
            결제 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900">결제 완료!</h1>
          <p className="text-sm text-gray-500">
            {result ? `${planLabels[result.planType] || result.planType} 플랜이 시작됐습니다.` : ""}
          </p>
        </div>

        {result && (
          <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">충전된 크레딧</span>
              <span className="font-semibold text-gray-900">+{result.creditsGranted.toLocaleString()} cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">현재 잔액</span>
              <span className="font-semibold text-blue-600">{result.creditBalance.toLocaleString()} cr</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/idea-match")}
            className="btn-primary flex-1"
          >
            아이디어 생성하기
          </button>
          <button
            type="button"
            onClick={() => router.push("/billing")}
            className="btn-secondary flex-1"
          >
            구독 관리
          </button>
        </div>
      </div>
    </div>
  );
}
