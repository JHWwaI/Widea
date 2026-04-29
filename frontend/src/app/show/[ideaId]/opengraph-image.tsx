import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Widea — AI 한국 창업 워크스페이스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

type ShowData = {
  idea: { titleKo: string; oneLinerKo: string | null };
  benchmark: { companyName: string | null; similarityPct: number | null } | null;
  progress: { overallPct: number };
};

export default async function Image({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;
  let title = "Widea";
  let oneLiner = "AI 창업 워크스페이스";
  let pct = 0;
  let benchmark = "";

  try {
    const res = await fetch(`${API_BASE}/api/show/${ideaId}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const json = (await res.json()) as ShowData;
      title = json.idea.titleKo || title;
      oneLiner = json.idea.oneLinerKo || oneLiner;
      pct = json.progress.overallPct ?? 0;
      benchmark = json.benchmark?.companyName
        ? `${json.benchmark.companyName} 와 ${json.benchmark.similarityPct ?? "?"}% 유사`
        : "";
    }
  } catch {
    /* fallback to defaults */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 25% 30%, rgba(124,58,237,0.45), transparent 55%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.35), transparent 50%), #0A0B10",
          padding: "70px",
          fontFamily: "system-ui, sans-serif",
          color: "white",
        }}
      >
        {/* 상단 라벨 */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#C4B5FD",
            }}
          >
            ⚡ WIDEA
          </span>
          {benchmark ? (
            <span
              style={{
                fontSize: 18,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(124,58,237,0.18)",
                color: "#DDD6FE",
                border: "1px solid rgba(124,58,237,0.4)",
              }}
            >
              ✦ {benchmark}
            </span>
          ) : null}
        </div>

        {/* 타이틀 + 한 줄 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <p
            style={{
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              color: "#D4D4D8",
              maxWidth: "950px",
              margin: 0,
            }}
          >
            {oneLiner}
          </p>
        </div>

        {/* 푸터 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 24,
          }}
        >
          <p style={{ fontSize: 22, color: "#A1A1AA", margin: 0 }}>
            한국형 창업 실행 워크스페이스
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <p
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: "#34D399",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {pct}%
            </p>
            <p style={{ fontSize: 18, color: "#71717A", margin: 0, marginTop: 4 }}>
              실행 진척
            </p>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
