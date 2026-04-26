import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// 환경 변수 검증
// ─────────────────────────────────────────────────────────────

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY 환경 변수가 설정되지 않았습니다.");
}
if (!PINECONE_INDEX_NAME) {
  throw new Error("PINECONE_INDEX_NAME 환경 변수가 설정되지 않았습니다.");
}
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}

// ─────────────────────────────────────────────────────────────
// 인터페이스 정의
// ─────────────────────────────────────────────────────────────

/**
 * Pinecone 벡터에 첨부되는 글로벌 스타트업 사례 메타데이터.
 *
 * - `dbId`는 PostgreSQL `GlobalCaseMeta.vectorDbId`와 1:1 매핑된다.
 * - 메타데이터 필터링(targetMarket 등)에 활용된다.
 * - Pinecone RecordMetadata(Record<string, ...>) 호환을 위해 type alias 사용.
 */
export type GlobalCaseVectorPayload = {
  /** PostgreSQL GlobalCaseMeta.vectorDbId 와 매칭되는 식별자 */
  dbId: string;
  /** 기업명 */
  companyName: string;
  /** 비즈니스 모델 (예: "SaaS", "Marketplace", "Freemium") */
  businessModel: string;
  /** 타겟 시장 (예: "B2B", "B2C", "B2B2C") */
  targetMarket: string;
};

/** searchSimilarCases 가 반환하는 단일 검색 결과 */
export interface CaseSearchResult {
  /** 유사도 점수 (0 ~ 1) */
  score: number;
  /** Pinecone 벡터에 저장된 메타데이터 */
  metadata: GlobalCaseVectorPayload;
}

// ─────────────────────────────────────────────────────────────
// 클라이언트 초기화
// ─────────────────────────────────────────────────────────────

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const pineconeIndex = pinecone.index<GlobalCaseVectorPayload>({
  name: PINECONE_INDEX_NAME,
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// ─────────────────────────────────────────────────────────────
// 텍스트 임베딩
// ─────────────────────────────────────────────────────────────

/**
 * Google Gemini gemini-embedding-001 모델을 사용하여
 * 입력 텍스트를 3072차원 벡터 배열로 변환한다.
 *
 * @param text - 임베딩할 원본 텍스트
 * @returns 숫자 배열 형태의 임베딩 벡터
 * @throws Gemini API 호출 실패 시 에러
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    throw new Error(`[generateEmbedding] 임베딩 생성 실패: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 데이터 삽입 (Upsert)
// ─────────────────────────────────────────────────────────────

/**
 * 글로벌 스타트업 사례를 Pinecone 인덱스에 Upsert 한다.
 *
 * 1. textContent 를 Gemini 임베딩으로 변환
 * 2. metadata.dbId 를 벡터 ID로 사용하여 Pinecone에 저장
 *
 * 동일한 dbId로 재호출하면 기존 벡터가 덮어써진다 (idempotent).
 *
 * @param textContent - 해당 기업의 사업 모델 상세 텍스트
 * @param metadata    - PostgreSQL GlobalCaseMeta와 매핑되는 메타데이터
 * @throws 임베딩 생성 또는 Pinecone upsert 실패 시 에러
 */
export async function upsertCase(
  textContent: string,
  metadata: GlobalCaseVectorPayload
): Promise<void> {
  try {
    const embedding = await generateEmbedding(textContent);

    await pineconeIndex.upsert({
      records: [
        {
          id: metadata.dbId,
          values: embedding,
          metadata,
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    throw new Error(
      `[upsertCase] 사례 upsert 실패 (dbId: ${metadata.dbId}): ${message}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// 벡터 유사도 검색
// ─────────────────────────────────────────────────────────────

/**
 * 유저의 검색어를 임베딩하여 Pinecone에서 가장 유사한
 * 글로벌 스타트업 사례를 검색한다.
 *
 * @param queryText          - 유저가 입력한 키워드 또는 사업 방침 텍스트
 * @param topK               - 반환할 최대 결과 수 (기본값: 3)
 * @param targetMarketFilter - 선택적 타겟 시장 필터 (예: "B2B")
 * @returns 유사도 점수와 메타데이터가 포함된 검색 결과 배열 (점수 내림차순)
 * @throws 임베딩 생성 또는 Pinecone 쿼리 실패 시 에러
 */
export async function searchSimilarCases(
  queryText: string,
  topK: number = 3,
  targetMarketFilter?: string
): Promise<CaseSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(queryText);

    // Pinecone 메타데이터 필터: targetMarket 이 일치하는 벡터만 반환
    const filter = targetMarketFilter
      ? { targetMarket: { $eq: targetMarketFilter } }
      : undefined;

    const response = await pineconeIndex.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    });

    return response.matches
      .filter((match) => match.metadata != null)
      .map((match) => ({
        score: match.score ?? 0,
        metadata: match.metadata as GlobalCaseVectorPayload,
      }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    throw new Error(`[searchSimilarCases] 벡터 검색 실패: ${message}`);
  }
}
