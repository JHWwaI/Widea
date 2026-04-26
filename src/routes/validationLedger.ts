import { type Express, type Request, type Response } from "express";
import { type PrismaClient, type DecisionStatus } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { getAuthedUser, handleRouteError, notFoundError, forbiddenError } from "../lib/http.js";
import { sanitizeText } from "../lib/validation.js";

type RegisterValidationLedgerRoutesOptions = {
  prisma: PrismaClient;
};

const VALID_STATUSES: DecisionStatus[] = ["PENDING", "GO", "PIVOT", "HOLD"];

export function registerValidationLedgerRoutes(
  app: Express,
  { prisma }: RegisterValidationLedgerRoutesOptions,
): void {
  /**
   * POST /api/blueprints/:blueprintId/validations
   * 블루프린트에 새 가설 검증 항목 추가
   */
  app.post(
    "/api/blueprints/:blueprintId/validations",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const blueprintId = String(req.params.blueprintId);

        const blueprint = await prisma.kBlueprint.findUnique({
          where: { id: blueprintId },
          include: { projectPolicy: { select: { userId: true } } },
        });

        if (!blueprint) throw notFoundError("블루프린트를 찾을 수 없습니다.");
        if (blueprint.projectPolicy.userId !== userId) throw forbiddenError();

        const hypothesis = sanitizeText(req.body.hypothesis);
        const actionItem = req.body.actionItem ? sanitizeText(req.body.actionItem) : null;

        if (!hypothesis) {
          res.status(400).json({ error: "hypothesis는 필수입니다." });
          return;
        }

        // 현재 최대 sprintRound 조회 후 +1
        const last = await prisma.validationLedger.findFirst({
          where: { kBlueprintId: blueprintId },
          orderBy: { sprintRound: "desc" },
          select: { sprintRound: true },
        });

        const sprintRound = (last?.sprintRound ?? 0) + 1;

        const entry = await prisma.validationLedger.create({
          data: {
            kBlueprintId: blueprintId,
            sprintRound,
            hypothesis,
            actionItem,
          },
        });

        res.status(201).json(entry);
      } catch (err) {
        handleRouteError(res, err, "가설 추가 오류");
      }
    },
  );

  /**
   * GET /api/blueprints/:blueprintId/validations
   * 블루프린트의 가설 검증 목록 조회
   */
  app.get(
    "/api/blueprints/:blueprintId/validations",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const blueprintId = String(req.params.blueprintId);

        const blueprint = await prisma.kBlueprint.findUnique({
          where: { id: blueprintId },
          include: { projectPolicy: { select: { userId: true } } },
        });

        if (!blueprint) throw notFoundError("블루프린트를 찾을 수 없습니다.");
        if (blueprint.projectPolicy.userId !== userId) throw forbiddenError();

        const validations = await prisma.validationLedger.findMany({
          where: { kBlueprintId: blueprintId },
          orderBy: { sprintRound: "asc" },
        });

        res.json({ validations });
      } catch (err) {
        handleRouteError(res, err, "가설 목록 조회 오류");
      }
    },
  );

  /**
   * PATCH /api/validations/:id
   * 가설 결과 업데이트 (decisionStatus, resultData, actionItem)
   */
  app.patch(
    "/api/validations/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const validationId = String(req.params.id);

        const existing = await prisma.validationLedger.findUnique({
          where: { id: validationId },
          include: {
            kBlueprint: {
              include: { projectPolicy: { select: { userId: true } } },
            },
          },
        });

        if (!existing) throw notFoundError("검증 항목을 찾을 수 없습니다.");
        if (existing.kBlueprint.projectPolicy.userId !== userId) throw forbiddenError();

        const { decisionStatus, resultData, actionItem, hypothesis } = req.body;

        const updateData: Record<string, unknown> = {};

        if (decisionStatus !== undefined) {
          if (!VALID_STATUSES.includes(decisionStatus)) {
            res.status(400).json({ error: `decisionStatus는 ${VALID_STATUSES.join(", ")} 중 하나여야 합니다.` });
            return;
          }
          updateData.decisionStatus = decisionStatus;
        }

        if (resultData !== undefined) updateData.resultData = resultData;
        if (actionItem !== undefined) updateData.actionItem = actionItem ? sanitizeText(actionItem) : null;
        if (hypothesis !== undefined) {
          const cleaned = sanitizeText(hypothesis);
          if (cleaned) updateData.hypothesis = cleaned;
        }

        const updated = await prisma.validationLedger.update({
          where: { id: validationId },
          data: updateData,
        });

        res.json(updated);
      } catch (err) {
        handleRouteError(res, err, "가설 업데이트 오류");
      }
    },
  );

  /**
   * DELETE /api/validations/:id
   * 가설 항목 삭제
   */
  app.delete(
    "/api/validations/:id",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const validationId = String(req.params.id);

        const existing = await prisma.validationLedger.findUnique({
          where: { id: validationId },
          include: {
            kBlueprint: {
              include: { projectPolicy: { select: { userId: true } } },
            },
          },
        });

        if (!existing) throw notFoundError("검증 항목을 찾을 수 없습니다.");
        if (existing.kBlueprint.projectPolicy.userId !== userId) throw forbiddenError();

        await prisma.validationLedger.delete({ where: { id: validationId } });

        res.json({ deleted: true });
      } catch (err) {
        handleRouteError(res, err, "가설 삭제 오류");
      }
    },
  );
}
