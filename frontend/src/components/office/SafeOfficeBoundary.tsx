"use client";

import { Component, type ReactNode } from "react";

type State = { error: Error | null };

export default class SafeOfficeBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // 콘솔에 자세히
    console.error("[Office] runtime error:", error, info?.componentStack ?? "");
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950 p-6">
          <div className="max-w-lg rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
            <p className="text-base font-semibold text-white">3D 사무실 로드 실패</p>
            <p className="mt-2 text-rose-300/80">
              {this.state.error.message || "알 수 없는 오류"}
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-black/40 p-2 text-left text-[0.65rem] text-rose-200/70">
              {String(this.state.error.stack ?? "").split("\n").slice(0, 6).join("\n")}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-md bg-white px-4 py-2 text-xs font-medium text-zinc-900"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
