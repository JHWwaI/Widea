/**
 * 애플리케이션 에러 정의 및 처리
 */

export type ErrorCode =
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_CREDITS"
  | "VALIDATION_ERROR";

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * 애플리케이션 에러 클래스
 * 모든 예상 가능한 에러를 이것으로 래핑합니다.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode ?? getStatusCodeForError(options.code);
    this.details = options.details ?? {};

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 에러 코드에 따른 HTTP 상태 코드 반환
 */
function getStatusCodeForError(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    INTERNAL_ERROR: 500,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INSUFFICIENT_CREDITS: 402,
    VALIDATION_ERROR: 400,
  };
  return statusMap[code];
}

/**
 * 문자열 에러 메시지 추출
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/**
 * 에러 응답 바디 생성
 */
export interface ErrorResponseBody {
  errorCode: ErrorCode;
  error: string;
  details?: Record<string, unknown>;
}

export function buildErrorResponse(err: unknown): {
  statusCode: number;
  body: ErrorResponseBody;
} {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: {
        errorCode: err.code,
        error: err.message,
        ...(Object.keys(err.details).length > 0 && { details: err.details }),
      },
    };
  }

  // 예상 외 에러는 내부 에러로 처리
  return {
    statusCode: 500,
    body: {
      errorCode: "INTERNAL_ERROR",
      error: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    },
  };
}
