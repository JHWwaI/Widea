import { type Express, type Request, type Response } from "express";
import { type PrismaClient } from "@prisma/client";
import { requireAuth } from "../lib/auth.js";
import { grantCredits } from "../lib/credits.js";
import { getAuthedUser, handleRouteError } from "../lib/http.js";
import { PLAN_CONFIG } from "../config/plans.js";
import { isAdminEmail } from "../lib/admin.js";

type RegisterBillingRoutesOptions = {
  prisma: PrismaClient;
  tossSecretKey?: string;
  tossClientKey?: string;
};

export function registerBillingRoutes(
  app: Express,
  { prisma, tossSecretKey, tossClientKey }: RegisterBillingRoutesOptions,
): void {
  app.get("/api/config/payment", (_req: Request, res: Response) => {
    res.json({ tossClientKey: tossClientKey || "" });
  });

  app.post("/api/payment/toss/confirm", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const { paymentKey, orderId, amount, planType } = req.body;

      if (!paymentKey || !orderId || !amount || !planType) {
        res.status(400).json({ error: "paymentKey, orderId, amount, planType 필수입니다." });
        return;
      }
      if (!PLAN_CONFIG[planType] || PLAN_CONFIG[planType].price === 0) {
        res.status(400).json({ error: "유효하지 않은 planType입니다." });
        return;
      }
      if (PLAN_CONFIG[planType].price !== Number(amount)) {
        res.status(400).json({ error: "결제 금액이 플랜 가격과 일치하지 않습니다." });
        return;
      }
      if (!tossSecretKey) {
        res.status(500).json({ error: "결제 서버가 설정되지 않았습니다." });
        return;
      }

      const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(tossSecretKey + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      });

      if (!tossRes.ok) {
        const err = await tossRes.json() as { message?: string };
        res.status(400).json({ error: err.message || "Toss 결제 승인 실패" });
        return;
      }

      console.log(`\n💳 Toss 결제 승인: ${planType} (${Number(amount).toLocaleString()}원)`);

      const config = PLAN_CONFIG[planType];

      await prisma.subscription.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscription = await prisma.subscription.create({
        data: { planType, expiresAt, amountPaid: config.price, creditsGranted: config.credits, userId },
      });

      await prisma.user.update({ where: { id: userId }, data: { planType } });
      const newBalance = await grantCredits(prisma, userId, config.credits, `subscription:${planType}`);

      console.log(`   구독 완료: +${config.credits} 크레딧 (잔액 ${newBalance})`);

      res.json({
        subscriptionId: subscription.id,
        planType,
        creditsGranted: config.credits,
        creditBalance: newBalance,
        expiresAt: subscription.expiresAt,
      });
    } catch (err) {
      handleRouteError(res, err, "Toss 결제 오류");
    }
  });

  app.get("/api/plans", (_req: Request, res: Response) => {
    res.json(
      Object.entries(PLAN_CONFIG).map(([key, value]) => ({
        planType: key,
        label: value.label,
        price: value.price,
        credits: value.credits,
      })),
    );
  });

  app.post("/api/subscribe", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const { planType } = req.body;

      if (!planType || !PLAN_CONFIG[planType]) {
        res.status(400).json({ error: "유효한 planType이 필요합니다.", validPlans: Object.keys(PLAN_CONFIG) });
        return;
      }

      // 결제 우회 방지: 유료 플랜은 /api/payment/toss/confirm 만 허용
      if (PLAN_CONFIG[planType].price > 0) {
        res.status(403).json({
          error: "유료 플랜은 결제를 통해서만 변경할 수 있습니다.",
          paymentRequired: true,
        });
        return;
      }

      const config = PLAN_CONFIG[planType];

      await prisma.subscription.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });

      const expiresAt = planType === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscription = await prisma.subscription.create({
        data: {
          planType,
          expiresAt,
          amountPaid: config.price,
          creditsGranted: config.credits,
          userId,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { planType },
      });
      const newBalance = await grantCredits(prisma, userId, config.credits, `subscription:${planType}`);

      console.log(`\n💳 구독 변경: ${planType} (+${config.credits} credits)`);

      res.json({
        subscriptionId: subscription.id,
        planType,
        creditsGranted: config.credits,
        creditBalance: newBalance,
        expiresAt: subscription.expiresAt,
      });
    } catch (err) {
      handleRouteError(res, err, "구독 변경 오류");
    }
  });

  // 🎬 관리자 전용 — 토스 결제창 우회하여 즉시 플랜 적용 (데모 전용)
  app.post("/api/admin/demo-subscribe", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const { planType } = req.body;

      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!dbUser || !isAdminEmail(dbUser.email)) {
        res.status(403).json({ error: "관리자 전용 기능입니다." });
        return;
      }

      if (!planType || !PLAN_CONFIG[planType]) {
        res.status(400).json({ error: "유효한 planType이 필요합니다." });
        return;
      }

      const config = PLAN_CONFIG[planType];

      await prisma.subscription.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });

      const expiresAt = config.price === 0 ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscription = await prisma.subscription.create({
        data: { planType, expiresAt, amountPaid: config.price, creditsGranted: config.credits, userId },
      });

      await prisma.user.update({ where: { id: userId }, data: { planType } });
      const newBalance = await grantCredits(prisma, userId, config.credits, `demo-subscription:${planType}`);

      console.log(`\n🎬 관리자 데모 구독: ${planType} (실거래 X)`);

      res.json({
        subscriptionId: subscription.id,
        planType,
        creditsGranted: config.credits,
        creditBalance: newBalance,
        expiresAt: subscription.expiresAt,
        demo: true,
      });
    } catch (err) {
      handleRouteError(res, err, "데모 구독 오류");
    }
  });

  app.get("/api/credits/history", requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuthedUser(req);
      const ledger = await prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json(ledger);
    } catch (err) {
      handleRouteError(res, err, "크레딧 내역 조회 오류");
    }
  });
}
