"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[error boundary]", error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="display-num text-7xl text-white/[0.18]">500</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">문제가 발생했습니다</h1>
        <p className="text-sm text-zinc-400">
          잠시 후 다시 시도해주세요. 문제가 계속되면 문의해주세요.
        </p>
        {process.env.NODE_ENV === "development" && error.message ? (
          <p className="mt-4 max-w-sm rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-zinc-400">
            {error.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-md border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
