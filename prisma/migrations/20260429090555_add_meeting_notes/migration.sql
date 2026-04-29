-- CreateEnum
CREATE TYPE "MeetingNoteSource" AS ENUM ('UPLOAD', 'LIVE_BROWSER', 'BOT');

-- CreateTable
CREATE TABLE "meeting_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idea_id" TEXT,
    "room_code" TEXT,
    "title" TEXT NOT NULL DEFAULT '회의록',
    "source" "MeetingNoteSource" NOT NULL,
    "duration_sec" INTEGER,
    "transcript_text" TEXT NOT NULL,
    "summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_notes_user_id_idx" ON "meeting_notes"("user_id");

-- CreateIndex
CREATE INDEX "meeting_notes_idea_id_idx" ON "meeting_notes"("idea_id");

-- CreateIndex
CREATE INDEX "meeting_notes_room_code_idx" ON "meeting_notes"("room_code");
