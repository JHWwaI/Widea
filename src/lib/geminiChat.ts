import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;
const GROQ_FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL ?? "llama-3.3-70b-versatile";

// gemini-2.5-pro는 무료 티어 한도 0 → 결제 미연동 시 429.
// 기본값은 무료 티어 관대한 2.5-flash. .env에 GEMINI_CHAT_MODEL=gemini-2.5-pro 지정 시 Pro 사용.
const DEFAULT_MODEL =
  process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash";

export interface GeminiChatOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** JSON 응답 강제 — Gemini가 자체적으로 valid JSON 보장 */
  jsonMode?: boolean;
  model?: string;
}

/**
 * Llama/Groq 인터페이스와 호환되는 단순 chat 헬퍼.
 * 입력: system instruction + user prompt → 텍스트(또는 JSON 문자열) 반환.
 *
 * `jsonMode: true`면 Gemini의 responseMimeType=application/json 강제 활성화 →
 * Llama가 자주 토하던 line-continuation 깨짐·코드펜스 같은 노이즈 제거됨.
 */
/**
 * 503/429 발생 시 지수 백오프 retry → 그래도 실패하면 fallback 모델로.
 * Default chain: gemini-2.5-flash → gemini-1.5-flash → gemini-1.5-pro
 */
async function callOnce(
  modelName: string,
  systemInstruction: string,
  userPrompt: string,
  options: GeminiChatOptions,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

function isTransient(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return (
    m.includes("503") ||
    m.includes("Service Unavailable") ||
    m.includes("overload") ||
    m.includes("UNAVAILABLE") ||
    m.includes("DEADLINE_EXCEEDED")
  );
}

function isQuotaExceeded(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return m.includes("429") || m.includes("Too Many Requests") || m.includes("Quota exceeded");
}

/** Groq + Llama 최후 폴백 (Gemini 무료 한도 소진 시) */
async function callGroqFallback(
  systemInstruction: string,
  userPrompt: string,
  options: GeminiChatOptions,
): Promise<string> {
  if (!groqClient) {
    throw new Error("GROQ_API_KEY가 없어서 Llama 폴백을 사용할 수 없습니다.");
  }
  console.warn(`[gemini→groq] Llama ${GROQ_FALLBACK_MODEL}로 최종 폴백`);
  const result = await groqClient.chat.completions.create({
    model: GROQ_FALLBACK_MODEL,
    max_tokens: options.maxOutputTokens ?? 8192,
    temperature: options.temperature ?? 0.6,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
    ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });
  return result.choices[0]?.message?.content ?? "";
}

// 2025년 v1beta API에서 사용 가능: gemini-2.5-flash, gemini-2.5-pro(유료), gemini-2.0-flash, gemini-flash-latest
const FALLBACK_CHAIN = (process.env.GEMINI_FALLBACK_CHAIN ?? "gemini-2.0-flash,gemini-flash-latest")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function geminiChat(
  systemInstruction: string,
  userPrompt: string,
  options: GeminiChatOptions = {},
): Promise<string> {
  const primary = options.model ?? DEFAULT_MODEL;
  const chain = [primary, ...FALLBACK_CHAIN.filter((m) => m !== primary)];

  let lastErr: unknown = null;
  let sawQuotaError = false;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    // 같은 모델로 최대 2회 retry (지수 백오프, transient 에러만)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callOnce(model, systemInstruction, userPrompt, options);
      } catch (err) {
        lastErr = err;
        if (isQuotaExceeded(err)) {
          sawQuotaError = true;
          console.warn(`[gemini] ${model} 무료 한도 소진 — 다음 모델로`);
          break; // retry 의미 없음. 다음 모델로
        }
        if (!isTransient(err)) throw err;
        const wait = 800 * (attempt + 1);
        console.warn(`[gemini] ${model} 일시 오류 (${attempt + 1}/2) — ${wait}ms 대기 후 재시도`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (i < chain.length - 1) {
      console.warn(`[gemini] ${model} 실패 → fallback ${chain[i + 1]}`);
    }
  }

  // 모든 Gemini 모델 실패 → Groq + Llama 최종 폴백
  if (sawQuotaError && groqClient) {
    try {
      return await callGroqFallback(systemInstruction, userPrompt, options);
    } catch (groqErr) {
      console.error(`[gemini→groq] Llama 폴백도 실패`);
      throw groqErr;
    }
  }

  throw lastErr ?? new Error("Gemini 모든 모델 실패");
}
