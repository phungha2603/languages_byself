-- DropIndex
DROP INDEX "VocabItem_topic_idx";

-- AlterTable
ALTER TABLE "VocabItem" DROP COLUMN "stageIds",
DROP COLUMN "topic",
ADD COLUMN     "chapter" TEXT,
ADD COLUMN     "chapterOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vocabLevelId" TEXT,
ADD COLUMN     "wordOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VocabLevel" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "minBand" DOUBLE PRECISION NOT NULL,
    "maxBand" DOUBLE PRECISION NOT NULL,
    "bandLabel" TEXT NOT NULL,
    "storyTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "VocabLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabLevel_order_key" ON "VocabLevel"("order");

-- CreateIndex
CREATE INDEX "VocabItem_vocabLevelId_chapter_idx" ON "VocabItem"("vocabLevelId", "chapter");

-- AddForeignKey
ALTER TABLE "VocabItem" ADD CONSTRAINT "VocabItem_vocabLevelId_fkey" FOREIGN KEY ("vocabLevelId") REFERENCES "VocabLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

