export const BOOTSTRAP_ADMIN_EMAIL = "admin@widea.local";

const ADMIN_EMAILS = new Set(
  [BOOTSTRAP_ADMIN_EMAIL, ...(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)],
);

export const ADMIN_CREDIT_BALANCE = 999999;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function getVisibleCreditBalance(input: {
  email: string | null | undefined;
  creditBalance: number;
}): number {
  return isAdminEmail(input.email) ? ADMIN_CREDIT_BALANCE : input.creditBalance;
}
