import type {
  BandExitEvaluation,
  DictionaryLookupResult,
  Exercise,
  ExerciseAttempt,
  GradingResult,
  GrammarCheckResult,
  IeltsBandStage,
  Mistake,
  NextSessionPlan,
  Skill,
  SpeakingPart,
  SrsRating,
  SrsState,
  SrsRetentionStats,
  StageGateDecision,
  TranslationResult,
  TtsResult,
  User,
  VocabItem,
  WeaknessProfile,
  WritingTaskType,
} from "@app/shared-types";

export interface SrsCardDto {
  id: string;
  userId: string;
  vocabId: string;
  due: string;
  stability: number;
  difficulty: number;
  state: SrsState;
  vocabItem: { id: string; headword: string; definitions: string[]; examples: string[]; ipa?: string };
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface AuthResult {
  accessToken: string;
  user: User;
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authToken?: string | null,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ApiError(response.status, body || response.statusText);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  resolveAssetUrl(relativeUrl: string): string {
    if (relativeUrl.startsWith("http")) return relativeUrl;
    const origin = this.baseUrl.replace(/\/api\/?$/, "");
    return `${origin}${relativeUrl}`;
  }

  createUser(email: string, displayName: string, targetBand?: number, startingStageId?: string): Promise<AuthResult> {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify({ email, displayName, targetBand, startingStageId }),
    });
  }

  loginWithGoogle(idToken: string, startingStageId?: string): Promise<AuthResult> {
    return this.request("/auth/google", { method: "POST", body: JSON.stringify({ idToken, startingStageId }) });
  }

  listStages(): Promise<IeltsBandStage[]> {
    return this.request("/ielts/stages");
  }

  getUserProgress(userId: string) {
    return this.request(`/ielts/users/${userId}/progress`);
  }

  evaluateGate(userId: string, stageId: string, mockAssessmentScore: number | null): Promise<StageGateDecision> {
    return this.request(`/ielts/users/${userId}/stages/${stageId}/evaluate`, {
      method: "POST",
      body: JSON.stringify({ mockAssessmentScore: mockAssessmentScore ?? undefined }),
    });
  }

  getWeaknessProfile(userId: string, stageId: string): Promise<WeaknessProfile> {
    return this.request(`/orchestrator/users/${userId}/weakness-profile?stageId=${encodeURIComponent(stageId)}`);
  }

  getNextSessionPlan(userId: string, stageId: string): Promise<NextSessionPlan> {
    return this.request(`/orchestrator/users/${userId}/next-session?stageId=${encodeURIComponent(stageId)}`);
  }

  getDueSrsCards(userId: string, limit = 20): Promise<SrsCardDto[]> {
    return this.request(`/srs/users/${userId}/due?limit=${limit}`);
  }

  addSrsCard(userId: string, vocabId: string): Promise<SrsCardDto> {
    return this.request(`/srs/users/${userId}/cards`, { method: "POST", body: JSON.stringify({ vocabId }) });
  }

  listMyCardVocabIds(userId: string): Promise<{ vocabId: string }[]> {
    return this.request(`/srs/users/${userId}/cards`);
  }

  reviewSrsCard(userId: string, vocabId: string, rating: SrsRating): Promise<SrsCardDto> {
    return this.request(`/srs/users/${userId}/review`, { method: "POST", body: JSON.stringify({ vocabId, rating }) });
  }

  getRetention(userId: string, stageId: string): Promise<SrsRetentionStats> {
    return this.request(`/srs/users/${userId}/retention?stageId=${encodeURIComponent(stageId)}`);
  }

  listExercises(stageId: string, skill?: Skill, maxDifficulty?: number): Promise<Exercise[]> {
    const params = new URLSearchParams({ stageId });
    if (skill) params.set("skill", skill);
    if (maxDifficulty) params.set("maxDifficulty", String(maxDifficulty));
    return this.request(`/exercises?${params.toString()}`);
  }

  submitAttempt(
    exerciseId: string,
    userId: string,
    payload: { score: number; accuracy: number; timeSpentSec: number; mistakes: Mistake[] },
  ) {
    return this.request(`/exercises/${exerciseId}/attempts?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  gradeWritingExercise(
    exerciseId: string,
    userId: string,
    essay: string,
    taskType?: WritingTaskType,
  ): Promise<{ attempt: ExerciseAttempt; grading: GradingResult }> {
    return this.request(`/exercises/${exerciseId}/grade-writing?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify({ essay, taskType }),
    });
  }

  gradeSpeakingExercise(
    exerciseId: string,
    userId: string,
    transcript: string,
    part?: SpeakingPart,
  ): Promise<{ attempt: ExerciseAttempt; grading: GradingResult }> {
    return this.request(`/exercises/${exerciseId}/grade-speaking?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify({ transcript, part }),
    });
  }

  listVocabByStage(stageId: string): Promise<VocabItem[]> {
    return this.request(`/vocab?stageId=${encodeURIComponent(stageId)}`);
  }

  lookupWord(word: string): Promise<DictionaryLookupResult> {
    return this.request(`/tools/dictionary?word=${encodeURIComponent(word)}`);
  }

  checkGrammar(text: string): Promise<GrammarCheckResult> {
    return this.request(`/tools/grammar/check`, { method: "POST", body: JSON.stringify({ text }) });
  }

  translate(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> {
    return this.request(`/tools/translation`, { method: "POST", body: JSON.stringify({ text, sourceLang, targetLang }) });
  }

  synthesizeSpeech(text: string, voice?: string): Promise<TtsResult> {
    return this.request(`/tools/tts`, { method: "POST", body: JSON.stringify({ text, voice }) });
  }
}

export { ApiError };
export type { BandExitEvaluation };
