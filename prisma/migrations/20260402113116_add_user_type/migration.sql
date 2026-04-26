-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INVESTOR', 'ACCELERATOR', 'FOUNDER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "user_type" "UserType";
