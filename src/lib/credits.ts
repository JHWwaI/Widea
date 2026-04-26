import { type CreditAction, type Prisma, type PrismaClient } from "@prisma/client";
import { ADMIN_CREDIT_BALANCE, isAdminEmail } from "./admin.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getCreditBalance(
  db: DbClient,
  userId: string,
): Promise<number | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, creditBalance: true },
  });

  if (!user) return null;
  return isAdminEmail(user.email) ? ADMIN_CREDIT_BALANCE : user.creditBalance;
}

export async function consumeCredits(
  db: DbClient,
  userId: string,
  cost: number,
  reason: string,
): Promise<{ balanceAfter: number } | null> {
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!existingUser) {
    throw new Error("크레딧 차감 대상 사용자를 찾을 수 없습니다.");
  }

  if (isAdminEmail(existingUser.email)) {
    return { balanceAfter: ADMIN_CREDIT_BALANCE };
  }

  const updated = await db.user.updateMany({
    where: {
      id: userId,
      creditBalance: { gte: cost },
    },
    data: {
      creditBalance: { decrement: cost },
    },
  });

  if (updated.count === 0) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user) {
    throw new Error("크레딧 차감 후 유저를 찾을 수 없습니다.");
  }

  await db.creditLedger.create({
    data: {
      action: "CONSUME",
      amount: -cost,
      balanceAfter: user.creditBalance,
      reason,
      userId,
    },
  });

  return { balanceAfter: user.creditBalance };
}

export async function grantCredits(
  db: DbClient,
  userId: string,
  amount: number,
  reason: string,
  action: CreditAction = "GRANT",
): Promise<number> {
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!existingUser) {
    throw new Error("크레딧 지급 대상 사용자를 찾을 수 없습니다.");
  }

  if (isAdminEmail(existingUser.email)) {
    return ADMIN_CREDIT_BALANCE;
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      creditBalance: { increment: amount },
    },
    select: { creditBalance: true },
  });

  await db.creditLedger.create({
    data: {
      action,
      amount,
      balanceAfter: user.creditBalance,
      reason,
      userId,
    },
  });

  return user.creditBalance;
}
