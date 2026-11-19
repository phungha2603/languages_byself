-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "VocabItem" ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "VocabItem_topic_idx" ON "VocabItem"("topic");
