import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const NEW_PW = "admin1234";
  const EMAIL = "dolchi37@gmail.com";
  const prisma = new PrismaClient();
  const hashed = await hashPassword(NEW_PW);
  const u = await prisma.user.update({
    where: { email: EMAIL },
    data: { password: hashed },
  });
  console.log(`✓ ${u.email} password reset → ${NEW_PW}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
