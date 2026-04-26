/**
 * 요청 데이터 타입 정의 및 검증
 */

// Discovery API
export interface DiscoveryRequest {
  keyword: string;
  topK?: number;
  targetMarket?: "B2B" | "B2C" | "B2B2C";
}

export interface DiscoveryResponse {
  cases: Array<{
    id: string;
    title: string;
    description: string;
    targetMarket: string;
    similarity: number;
  }>;
}

// Idea Match Session API
export interface IdeaMatchSessionRequest {
  projectPolicyId: string;
  useLocalMarketData?: boolean;
}

export interface IdeaMatchSessionResponse {
  sessionId: string;
  ideas: Array<{
    id: string;
    title: string;
    rationale: string;
    marketSize?: string;
  }>;
}

// Project API
export interface CreateProjectRequest {
  name: string;
  description?: string;
  targetMarket?: "B2B" | "B2C" | "B2B2C";
}

export interface CreateProjectPolicyRequest {
  projectId: string;
  policy: string;
}

// Auth API
export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * HTML 태그를 제거하여 XSS를 방지합니다.
 * 스크립트, 이벤트 핸들러, 위험한 태그를 모두 제거합니다.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * 사용자 입력 텍스트를 정제합니다 (trim + HTML strip).
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return stripHtml(input.trim());
}

/**
 * 문자열이 유효한 UUID 형식인지 확인
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * 유효한 이메일 형식 확인
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * 요청 데이터 검증 결과
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * 필수 문자열 필드 검증
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number }
): string | null {
  if (typeof value !== "string") {
    return `${fieldName}은(는) 문자열이어야 합니다.`;
  }
  if (!value.trim()) {
    return `${fieldName}은(는) 필수입니다.`;
  }
  if (options?.minLength && value.length < options.minLength) {
    return `${fieldName}은(는) 최소 ${options.minLength}자 이상이어야 합니다.`;
  }
  if (options?.maxLength && value.length > options.maxLength) {
    return `${fieldName}은(는) 최대 ${options.maxLength}자 이하여야 합니다.`;
  }
  return null;
}

/**
 * Discovery 요청 검증
 */
export function validateDiscoveryRequest(body: unknown): ValidationResult<DiscoveryRequest> {
  const errors: Record<string, string> = {};

  if (typeof body !== "object" || body === null) {
    return {
      success: false,
      errors: { body: "요청 본문이 유효하지 않습니다." },
    };
  }

  const obj = body as Record<string, unknown>;

  const keywordError = validateString(obj.keyword, "keyword", { maxLength: 200 });
  if (keywordError) errors.keyword = keywordError;

  if (obj.topK !== undefined) {
    const topK = Number(obj.topK);
    if (isNaN(topK) || topK < 1 || topK > 10) {
      errors.topK = "topK는 1 이상 10 이하의 숫자여야 합니다.";
    }
  }

  if (obj.targetMarket !== undefined) {
    const validMarkets = ["B2B", "B2C", "B2B2C"];
    if (!validMarkets.includes(obj.targetMarket as string)) {
      errors.targetMarket = `targetMarket은 ${validMarkets.join(", ")} 중 하나여야 합니다.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      keyword: obj.keyword as string,
      topK: obj.topK ? Number(obj.topK) : undefined,
      targetMarket: obj.targetMarket as "B2B" | "B2C" | "B2B2C" | undefined,
    },
  };
}

/**
 * SignUp 요청 검증
 */
export function validateSignUpRequest(body: unknown): ValidationResult<SignUpRequest> {
  const errors: Record<string, string> = {};

  if (typeof body !== "object" || body === null) {
    return {
      success: false,
      errors: { body: "요청 본문이 유효하지 않습니다." },
    };
  }

  const obj = body as Record<string, unknown>;

  if (!isValidEmail(obj.email)) {
    errors.email = "유효한 이메일 주소를 입력해주세요.";
  }

  const passwordError = validateString(obj.password, "password", { minLength: 8 });
  if (passwordError) errors.password = passwordError;

  if (obj.name !== undefined) {
    const nameError = validateString(obj.name, "name", { minLength: 1, maxLength: 100 });
    if (nameError) errors.name = nameError;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: obj.email as string,
      password: obj.password as string,
      name: obj.name ? (obj.name as string) : undefined,
    },
  };
}
