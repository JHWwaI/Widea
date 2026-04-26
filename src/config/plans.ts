export const PLAN_CONFIG: Record<string, { price: number; credits: number; label: string }> = {
  FREE:       { price: 0,       credits: 50,   label: "Free" },
  STARTER:    { price: 9900,    credits: 200,  label: "Starter" },
  PRO:        { price: 29900,   credits: 700,  label: "Pro" },
  TEAM:       { price: 79900,   credits: 2000, label: "Team" },
  ENTERPRISE: { price: 199900,  credits: 5000, label: "Enterprise" },
};
