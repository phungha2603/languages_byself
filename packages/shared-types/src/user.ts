export interface User {
  id: string;
  email: string;
  displayName: string;
  /** Short free-text self-description the learner sets themselves. */
  status?: string;
  createdAt: string;
  currentStageId: string;
  targetBand?: number;
}

export interface StudySession {
  id: string;
  userId: string;
  stageId: string;
  startedAt: string;
  endedAt?: string;
  exerciseAttemptIds: string[];
  srsReviewLogIds: string[];
}
