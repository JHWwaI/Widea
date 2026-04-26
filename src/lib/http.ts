import { type Request, type Response } from "express";
import { type JwtPayload } from "./auth.js";
import { AppError, buildErrorResponse, getErrorMessage } from "./errors.js";

// Re-export for convenience
export { AppError, buildErrorResponse, getErrorMessage, type ErrorCode, type ErrorResponseBody } from "./errors.js";

export type AuthedRequest = Request & { user: JwtPayload };

export function getAuthedUser(req: Request): JwtPayload {
  return (req as AuthedRequest).user;
}

export function handleRouteError(
  res: Response,
  err: unknown,
  context?: string,
): void {
  const message = getErrorMessage(err);
  if (context) {
    console.error(`${context}:`, message);
  } else {
    console.error("Unhandled error:", message);
  }

  const { statusCode, body } = buildErrorResponse(err);
  res.status(statusCode).json(body);
}

export function respondInsufficientCredits(
  res: Response,
  options: {
    feature: string;
    required: number;
    creditBalance: number | null;
  },
): void {
  const err = new AppError({
    code: "INSUFFICIENT_CREDITS",
    message: `${options.feature}에 필요한 크레딧이 부족합니다.`,
    statusCode: 402,
    details: {
      feature: options.feature,
      required: options.required,
      creditBalance: options.creditBalance ?? 0,
      hint: "플랜을 업그레이드하거나 크레딧을 충전한 후 다시 시도해주세요.",
    },
  });

  const { statusCode, body } = buildErrorResponse(err);
  res.status(statusCode).json(body);
}

export function respondCreditConflict(
  res: Response,
  options: {
    feature: string;
    required: number;
  },
): void {
  const err = new AppError({
    code: "INSUFFICIENT_CREDITS",
    message: `${options.feature}에 필요한 크레딧이 부족합니다.`,
    statusCode: 402,
    details: {
      feature: options.feature,
      required: options.required,
      hint: "다른 요청이 남은 크레딧을 사용했을 수 있습니다. 페이지를 새로고침하고 다시 시도해주세요.",
    },
  });

  const { statusCode, body } = buildErrorResponse(err);
  res.status(statusCode).json(body);
}

// 자주 사용되는 에러 생성 헬퍼
export function badRequestError(message: string): AppError {
  return new AppError({
    code: "BAD_REQUEST",
    message,
  });
}

export function unauthorizedError(message = "인증이 필요합니다."): AppError {
  return new AppError({
    code: "UNAUTHORIZED",
    message,
  });
}

export function forbiddenError(message = "접근 권한이 없습니다."): AppError {
  return new AppError({
    code: "FORBIDDEN",
    message,
  });
}

export function notFoundError(message = "찾을 수 없습니다."): AppError {
  return new AppError({
    code: "NOT_FOUND",
    message,
  });
}

export function conflictError(message: string): AppError {
  return new AppError({
    code: "CONFLICT",
    message,
  });
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError({
    code: "VALIDATION_ERROR",
    message,
    details,
  });
}
