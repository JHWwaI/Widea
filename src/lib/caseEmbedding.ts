/**
 * GlobalCaseMeta 임베딩 텍스트 표준 빌더
 *
 * 목적:
 * - seed.ts, import_real_startups.ts, sync_pinecone.ts, enrich_cases.ts가
 *   동일한 고품질 임베딩 텍스트를 생성하도록 단일화
 * - deepAnalysis(10개 JSON 블록 포함) 있으면 풀 품질, 없으면 메타 기반 최소 품질
 * - Pinecone 벡터 임베딩의 일관성 확보
 */

export interface CaseEmbeddingSource {
  // 필수
  companyName: string;
  industry: string;
  revenueModel: string | null;
  targetMarket: string | null;

  // 메타 보강 (있으면 품질 향상)
  foundedYear?: number | null;
  fundingStage?: string | null;
  geographicOrigin?: string | null;
  targetCustomerProfile?: string | null;
  shortDescription?: string | null;
  tags?: unknown;

  // ── 기존 텍스트 필드 ──────────────────────────────────────
  problemStatement?: string | null;
  solutionCore?: string | null;
  initialWedge?: string | null;
  unfairAdvantage?: string | null;
  unitEconomics?: string | null;
  signatureMoves?: string | null;
  koreaAdaptNotes?: string | null;

  // ── 새 JSON 블록 (있으면 포함) ───────────────────────────
  growthStory?: Record<string, unknown> | null;
  technologyDNA?: Record<string, unknown> | null;
  founderDNA?: Record<string, unknown> | null;
  koreaStrategy?: Record<string, unknown> | null;
  replicationGuide?: Record<string, unknown> | null;
  marketTiming?: Record<string, unknown> | null;
  competitiveLandscape?: Record<string, unknown> | null;
  revenueDeepDive?: Record<string, unknown> | null;
  networkEffects?: Record<string, unknown> | null;
  expansionPlaybook?: Record<string, unknown> | null;
  investorPOV?: Record<string, unknown> | null;
}

/** JSON 블록에서 문자열 값들만 추출해 하나의 문단으로 합친다 */
function flattenJson(obj: Record<string, unknown> | null | undefined): string {
  if (!obj) return "";
  return Object.values(obj)
    .map((v) => {
      if (typeof v === "string") return v;
      if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(", ");
      if (typeof v === "object" && v !== null) return flattenJson(v as Record<string, unknown>);
      return "";
    })
    .filter(Boolean)
    .join(" | ");
}

/**
 * 케이스 메타데이터로부터 표준화된 임베딩 텍스트를 생성합니다.
 *
 * 전략:
 * 1. 헤더: 필수 정보 (회사명, 산업, 수익모델, 타겟마켓, 한 줄 소개)
 * 2. 맥락: 분류 정보 (지역, 고객, 설립연도, 투자단계, 태그)
 * 3. 기존 심화: 기존 텍스트 필드 (문제, 솔루션, 전략 등)
 * 4. 신규 심화: 10개 JSON 블록 요약 텍스트
 */
export function buildCaseEmbeddingText(source: CaseEmbeddingSource): string {
  const parts: string[] = [];

  // ─── 헤더: 필수 기본 정보 ──────────────────────────────────
  parts.push(`[${source.companyName}]`);
  if (source.shortDescription) parts.push(source.shortDescription);
  parts.push(`산업: ${source.industry}`);
  parts.push(`수익 모델: ${source.revenueModel ?? "N/A"}`);
  parts.push(`타겟 시장: ${source.targetMarket ?? "N/A"}`);

  // ─── 맥락: 분류 정보 ───────────────────────────────────────
  if (source.geographicOrigin)      parts.push(`출신 지역: ${source.geographicOrigin}`);
  if (source.foundedYear)           parts.push(`설립연도: ${source.foundedYear}`);
  if (source.fundingStage)          parts.push(`투자 단계: ${source.fundingStage}`);
  if (source.targetCustomerProfile) parts.push(`타겟 고객: ${source.targetCustomerProfile}`);
  if (Array.isArray(source.tags) && source.tags.length > 0) {
    parts.push(`태그: ${(source.tags as string[]).join(", ")}`);
  }

  // ─── 기존 텍스트 심화 분석 ─────────────────────────────────
  if (source.problemStatement) parts.push(`핵심 문제: ${source.problemStatement}`);
  if (source.solutionCore)     parts.push(`솔루션: ${source.solutionCore}`);
  if (source.initialWedge)     parts.push(`초기 진입 전략: ${source.initialWedge}`);
  if (source.unfairAdvantage)  parts.push(`독보적 경쟁우위: ${source.unfairAdvantage}`);
  if (source.unitEconomics)    parts.push(`수익 구조: ${source.unitEconomics}`);
  if (source.signatureMoves)   parts.push(`성장 트리거: ${source.signatureMoves}`);
  if (source.koreaAdaptNotes)  parts.push(`한국 적용 노트: ${source.koreaAdaptNotes}`);

  // ─── 신규 JSON 블록 심화 분석 ──────────────────────────────
  const growthText = flattenJson(source.growthStory);
  if (growthText) parts.push(`성장 스토리: ${growthText}`);

  const techText = flattenJson(source.technologyDNA);
  if (techText) parts.push(`기술 DNA: ${techText}`);

  const founderText = flattenJson(source.founderDNA);
  if (founderText) parts.push(`창업팀 DNA: ${founderText}`);

  const koreaText = flattenJson(source.koreaStrategy);
  if (koreaText) parts.push(`한국 시장 전략: ${koreaText}`);

  const replicationText = flattenJson(source.replicationGuide);
  if (replicationText) parts.push(`복제 가이드: ${replicationText}`);

  const timingText = flattenJson(source.marketTiming);
  if (timingText) parts.push(`시장 타이밍: ${timingText}`);

  const competitiveText = flattenJson(source.competitiveLandscape);
  if (competitiveText) parts.push(`경쟁 구도: ${competitiveText}`);

  const revenueText = flattenJson(source.revenueDeepDive);
  if (revenueText) parts.push(`수익 모델 상세: ${revenueText}`);

  const networkText = flattenJson(source.networkEffects);
  if (networkText) parts.push(`네트워크 효과: ${networkText}`);

  const expansionText = flattenJson(source.expansionPlaybook);
  if (expansionText) parts.push(`글로벌 확장: ${expansionText}`);

  const investorText = flattenJson(source.investorPOV);
  if (investorText) parts.push(`투자자 관점: ${investorText}`);

  return parts.join("\n");
}
