/**
 * Common middleware utilities
 */

import rateLimit from "express-rate-limit";
import { type Request, type Response, type NextFunction } from "express";

/**
 * Create a rate limiter for API endpoints
 * Default: 100 requests per 15 minutes per IP
 */
export const createApiLimiter = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 1000
) => {
  return rateLimit({
    windowMs,
    max,
    message: "API 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Create a stricter rate limiter for AI-intensive operations
 * Default: 20 requests per 15 minutes per IP per endpoint
 * Used for: discovery, blueprint, idea-match
 */
export const createAiOpLimiter = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 200
) => {
  return rateLimit({
    windowMs,
    max,
    message: "AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for admin users
      const user = (req as any).user;
      return user?.isAdmin === true;
    },
  });
};

/**
 * Create a rate limiter for authentication endpoints
 * Default: 20 requests per 15 minutes per IP
 * Used for: register, login (brute-force prevention)
 */
export const createAuthLimiter = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 20
) => {
  return rateLimit({
    windowMs,
    max,
    message: "인증 요청이 너무 많습니다. 15분 후 다시 시도해주세요.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * CORS configuration for frontend
 */
export const getCorsConfig = () => {
  const allowedOrigins = [
    "https://widea.kr",
  ];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow all localhost ports in development
      if (origin.match(/^http:\/\/localhost:\d+$/)) {
        return callback(null, true);
      }

      // Allow LAN IP ranges (192.168.x.x, 172.16-31.x.x, 10.x.x.x) — for testing from phones/other PCs on same network
      if (origin.match(/^http:\/\/(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+:\d+$/)) {
        return callback(null, true);
      }

      // Cloudflare Tunnel (개발·데모용)
      if (origin.match(/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/)) {
        return callback(null, true);
      }

      // Vercel 배포 (본 프로젝트 + preview)
      if (origin.match(/^https:\/\/[a-z0-9-]+\.vercel\.app$/)) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("[Error]", err.message);

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      errorCode: "CORS_ERROR",
      error: "요청이 허용되지 않습니다.",
    });
  }

  // Default error
  res.status(500).json({
    errorCode: "INTERNAL_ERROR",
    error: "서버 오류가 발생했습니다.",
  });
};
