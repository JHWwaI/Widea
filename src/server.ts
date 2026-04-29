import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerCommunityRoutes } from "./routes/community.js";
import { registerIdeaMatchSessionRoutes } from "./routes/ideaMatchSessions.js";
import { registerDiscoveryRoutes } from "./routes/discovery.js";
import { registerBlueprintRoutes } from "./routes/blueprint.js";
import { registerIdeaMatchRoutes } from "./routes/ideaMatch.js";
import { registerValidationLedgerRoutes } from "./routes/validationLedger.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerCollabRoutes } from "./routes/collab.js";
import { registerGovProgramRoutes } from "./routes/govPrograms.js";
import { registerWorkspaceRoutes } from "./routes/workspace.js";
import { registerShowRoutes } from "./routes/show.js";
import { registerMeetingRoutes } from "./routes/meetings.js";
import { getEnv } from "./lib/env.js";
import { getCorsConfig, createApiLimiter, createAiOpLimiter, createAuthLimiter, errorHandler } from "./lib/middleware.js";

// Environment setup
const env = getEnv();
const GROQ_API_KEY = env.groq.apiKey;
const TOSS_SECRET_KEY = env.toss.secretKey;
const TOSS_CLIENT_KEY = env.toss.clientKey;

// Initialize database and LLM clients
const prisma = new PrismaClient();
const groq = new Groq({ apiKey: GROQ_API_KEY });

// Express app setup
const app = express();

// Middleware: CORS
app.use(cors(getCorsConfig()));

// Middleware: JSON parsing
app.use(express.json());

// Health check (운영 헬스체크용 — Railway/Fly 등이 이 경로를 ping)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Middleware: General API rate limiting (100 req per 15 min)
app.use("/api/", createApiLimiter());

// Middleware: Auth rate limiting (20 req per 15 min per IP - brute-force prevention)
app.use("/api/auth/login", createAuthLimiter());
app.use("/api/auth/register", createAuthLimiter());

// Middleware: Stricter rate limiting for AI operations (20 req per 15 min per user)
const aiLimiter = createAiOpLimiter();
app.use("/api/discovery", aiLimiter);
app.use("/api/blueprint", aiLimiter);
app.use("/api/idea-match", aiLimiter);

// Register all routes
registerAuthRoutes(app, { prisma });
registerProjectRoutes(app, { prisma });
registerBillingRoutes(app, {
  prisma,
  tossSecretKey: TOSS_SECRET_KEY,
  tossClientKey: TOSS_CLIENT_KEY,
});
registerCommunityRoutes(app, { prisma });
registerIdeaMatchSessionRoutes(app, { prisma });
registerDiscoveryRoutes(app, { prisma });
registerBlueprintRoutes(app, { prisma, groq });
registerIdeaMatchRoutes(app, { prisma, groq });
registerValidationLedgerRoutes(app, { prisma });
registerAdminRoutes(app, { prisma });
registerCollabRoutes(app, { prisma });
registerGovProgramRoutes(app, { prisma, groq });
registerWorkspaceRoutes(app, { prisma });
registerShowRoutes(app, { prisma });
registerMeetingRoutes(app, { prisma });

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(52));
  console.log("  Widea API Server");
  console.log("=".repeat(52));
  console.log(`  http://localhost:${PORT}`);
  console.log("-".repeat(52));
  console.log("  POST /api/discovery      Find similar global startup cases");
  console.log("  POST /api/blueprint      Generate localized execution blueprint");
  console.log("  POST /api/idea-match     AI-generate Korean business ideas");
  console.log("  PATCH /api/ideas/:id/unlock  Unlock paid ideas");
  console.log("  POST /api/blueprints/:id/validations  Hypothesis tracking");
  console.log("  GET  /api/admin/stats    Admin dashboard stats");
  console.log("=".repeat(52) + "\n");
});
