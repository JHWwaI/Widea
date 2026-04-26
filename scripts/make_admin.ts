import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";
import { ADMIN_CREDIT_BALANCE, isAdminEmail } from "../src/lib/admin.js";

const prisma = new PrismaClient();

function readArg(flag: string): string | undefined {
  const index = process.argv.findIndex((value) => value === flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = readArg("--email");
  const password = readArg("--password");
  const name = readArg("--name") || "Admin";

  if (!email || !password) {
    throw new Error("Usage: npm run make-admin -- --email admin@example.com --password <password> [--name Admin]");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      password: hashedPassword,
      name,
      planType: "ENTERPRISE",
      creditBalance: ADMIN_CREDIT_BALANCE,
    },
    create: {
      email: normalizedEmail,
      password: hashedPassword,
      name,
      planType: "ENTERPRISE",
      creditBalance: ADMIN_CREDIT_BALANCE,
    },
  });

  console.log(`Admin account ready: ${user.email}`);
  console.log(`Plan: ${user.planType}`);
  console.log(`Seeded credits: ${ADMIN_CREDIT_BALANCE}`);

  if (!isAdminEmail(user.email)) {
    console.log("");
    console.log("Unlimited mode is email-based.");
    console.log(`Add this to your .env and restart the server: ADMIN_EMAILS=${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
