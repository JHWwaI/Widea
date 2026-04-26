-- CreateTable
CREATE TABLE "user_case_unlocks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_case_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_case_unlocks_user_id_idx" ON "user_case_unlocks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_case_unlocks_user_id_case_id_key" ON "user_case_unlocks"("user_id", "case_id");

-- AddForeignKey
ALTER TABLE "user_case_unlocks" ADD CONSTRAINT "user_case_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
