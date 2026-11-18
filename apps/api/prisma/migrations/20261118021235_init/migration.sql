-- CreateEnum
CREATE TYPE "BandStageStatus" AS ENUM ('locked', 'unlocked', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "SrsCardState" AS ENUM ('new', 'learning', 'review', 'relearning');

-- CreateEnum
CREATE TYPE "SrsRating" AS ENUM ('again', 'hard', 'good', 'easy');

-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('listening', 'speaking', 'reading', 'writing');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('listening_mcq', 'listening_dictation', 'listening_note_completion', 'speaking_shadowing', 'speaking_cue_card', 'speaking_qa', 'reading_mcq', 'reading_true_false_not_given', 'reading_matching_headings', 'writing_task1_report', 'writing_task2_essay', 'grammar_cloze', 'vocab_flashcard');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentStageId" TEXT NOT NULL,
    "targetBand" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkillDifficulty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 3,

    CONSTRAINT "UserSkillDifficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeltsStage" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "minBand" DOUBLE PRECISION NOT NULL,
    "maxBand" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "exitCriteria" JSONB NOT NULL,

    CONSTRAINT "IeltsStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStageProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "status" "BandStageStatus" NOT NULL DEFAULT 'locked',
    "unlockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserStageProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandExitEvaluationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passed" BOOLEAN NOT NULL,
    "skillAccuracy" JSONB NOT NULL,
    "vocabRetention" DOUBLE PRECISION NOT NULL,
    "mockAssessmentScore" DOUBLE PRECISION,
    "openGrammarWeaknesses" INTEGER NOT NULL,
    "unmetCriteria" JSONB NOT NULL,

    CONSTRAINT "BandExitEvaluationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaknessProfileSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skillMastery" JSONB NOT NULL,
    "skillAccuracyTrend" JSONB NOT NULL,
    "grammarWeaknesses" JSONB NOT NULL,
    "vocabWeaknesses" JSONB NOT NULL,

    CONSTRAINT "WeaknessProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabItem" (
    "id" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "ipa" TEXT,
    "partOfSpeech" TEXT,
    "definitions" JSONB NOT NULL,
    "translations" JSONB NOT NULL,
    "examples" JSONB NOT NULL,
    "cefrLevel" TEXT,
    "audioUrl" TEXT,
    "stageIds" JSONB NOT NULL,

    CONSTRAINT "VocabItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SrsCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabId" TEXT NOT NULL,
    "due" TIMESTAMP(3) NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "elapsedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" "SrsCardState" NOT NULL DEFAULT 'new',
    "lastReview" TIMESTAMP(3),

    CONSTRAINT "SrsCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SrsReviewLog" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" "SrsRating" NOT NULL,
    "elapsedDays" DOUBLE PRECISION NOT NULL,
    "scheduledDays" DOUBLE PRECISION NOT NULL,
    "stabilityBefore" DOUBLE PRECISION NOT NULL,
    "stabilityAfter" DOUBLE PRECISION NOT NULL,
    "difficultyBefore" DOUBLE PRECISION NOT NULL,
    "difficultyAfter" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SrsReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "skill" "Skill" NOT NULL,
    "stageId" TEXT NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "prompt" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "grammarTopics" JSONB NOT NULL,
    "vocabIds" JSONB NOT NULL,
    "answerKey" JSONB NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sessionId" TEXT,
    "skill" "Skill" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "timeSpentSec" INTEGER NOT NULL,
    "mistakes" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillDifficulty_userId_skill_key" ON "UserSkillDifficulty"("userId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsStage_order_key" ON "IeltsStage"("order");

-- CreateIndex
CREATE UNIQUE INDEX "UserStageProgress_userId_stageId_key" ON "UserStageProgress"("userId", "stageId");

-- CreateIndex
CREATE INDEX "BandExitEvaluationLog_userId_stageId_evaluatedAt_idx" ON "BandExitEvaluationLog"("userId", "stageId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "WeaknessProfileSnapshot_userId_stageId_generatedAt_idx" ON "WeaknessProfileSnapshot"("userId", "stageId", "generatedAt");

-- CreateIndex
CREATE INDEX "VocabItem_headword_idx" ON "VocabItem"("headword");

-- CreateIndex
CREATE INDEX "SrsCard_userId_due_idx" ON "SrsCard"("userId", "due");

-- CreateIndex
CREATE UNIQUE INDEX "SrsCard_userId_vocabId_key" ON "SrsCard"("userId", "vocabId");

-- CreateIndex
CREATE INDEX "SrsReviewLog_cardId_reviewedAt_idx" ON "SrsReviewLog"("cardId", "reviewedAt");

-- CreateIndex
CREATE INDEX "Exercise_stageId_skill_difficulty_idx" ON "Exercise"("stageId", "skill", "difficulty");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_userId_skill_submittedAt_idx" ON "ExerciseAttempt"("userId", "skill", "submittedAt");

-- CreateIndex
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "UserSkillDifficulty" ADD CONSTRAINT "UserSkillDifficulty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStageProgress" ADD CONSTRAINT "UserStageProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStageProgress" ADD CONSTRAINT "UserStageProgress_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "IeltsStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandExitEvaluationLog" ADD CONSTRAINT "BandExitEvaluationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandExitEvaluationLog" ADD CONSTRAINT "BandExitEvaluationLog_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "IeltsStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaknessProfileSnapshot" ADD CONSTRAINT "WeaknessProfileSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaknessProfileSnapshot" ADD CONSTRAINT "WeaknessProfileSnapshot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "IeltsStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SrsCard" ADD CONSTRAINT "SrsCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SrsCard" ADD CONSTRAINT "SrsCard_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "VocabItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SrsReviewLog" ADD CONSTRAINT "SrsReviewLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "SrsCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SrsReviewLog" ADD CONSTRAINT "SrsReviewLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "IeltsStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "IeltsStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
