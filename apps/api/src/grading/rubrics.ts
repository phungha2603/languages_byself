/**
 * Condensed, paraphrased summaries of the band-distinguishing features in
 * IELTS's public band descriptors (Writing Task 1 & 2, Speaking), grounded in
 * the official criteria names and documented wording patterns published at
 * ielts.org. These are *our own paraphrase* for grounding an LLM grading
 * prompt — not a reproduction of the copyrighted official text. For the
 * authoritative wording, see the public-version PDFs on ielts.org.
 */

type BandTable = Record<4 | 5 | 6 | 7 | 8 | 9, string>;

export const WRITING_TASK_ACHIEVEMENT: BandTable = {
  4: "Attempts the task but may misunderstand it; key features may be missing or the structure confused.",
  5: "Generally addresses the task; format may be inappropriate in places; recounts details mechanically with no clear overview; key features may be missing or inaccurate.",
  6: "Addresses the task's requirements; presents an overview with appropriately selected information, though some details may be irrelevant or inaccurate.",
  7: "Covers the task's requirements; presents a clear overview of main trends/differences/stages and highlights key features, though some data may be missing or imprecise.",
  8: "Covers all requirements sufficiently; clearly presents and highlights key features/trends with accurate data; minimal over-generalisation.",
  9: "Fully satisfies all requirements with a fully developed overview; key features/comparisons are presented skilfully and precisely.",
};

export const WRITING_TASK_RESPONSE: BandTable = {
  4: "Barely addresses the task; position is unclear; ideas are largely irrelevant or repetitive.",
  5: "Addresses the task only partially; format may be inappropriate; main ideas are present but limited or under-developed.",
  6: "Addresses all parts of the task, though some more fully than others; position is relevant though conclusions may be unclear; some ideas may be under-developed.",
  7: "Addresses all parts of the task with a clear position throughout; main ideas are extended and supported, though some may be over-generalised.",
  8: "Sufficiently addresses all parts with a well-developed response; ideas are relevant, extended, and well supported; position is clear throughout.",
  9: "Fully addresses all parts with a fully developed position; ideas are relevant, fully extended, and well supported.",
};

export const WRITING_COHERENCE_COHESION: BandTable = {
  4: "Ideas are not arranged coherently; minimal or mechanical use of cohesive devices.",
  5: "Organises information with some logic but overall progression is unclear; cohesive devices used inaccurately or repetitively.",
  6: "Coherent arrangement with clear overall progression; cohesive devices used effectively but with some over/under-use; paragraphing not always logical.",
  7: "Logically organised with clear progression throughout; a range of cohesive devices used flexibly with occasional over/under-use; each paragraph has a clear central topic.",
  8: "Sequences information and ideas logically; manages all aspects of cohesion well; paragraphing is sufficient and appropriate.",
  9: "Cohesion is handled so skilfully it attracts no attention; paragraphing is skilfully managed.",
};

export const WRITING_LEXICAL_RESOURCE: BandTable = {
  4: "Limited vocabulary, may be inadequate for the task; errors cause strain for the reader.",
  5: "Limited range but adequate for the task; noticeable errors in word choice/spelling/word formation that may impede meaning.",
  6: "Adequate range for the task; attempts less common vocabulary with some inaccuracy; errors rarely impede communication.",
  7: "Sufficient range to allow some flexibility and precision; less common items used with some awareness of style/collocation; few spelling/word-formation errors.",
  8: "Wide range used fluently and flexibly for precise meaning; skilful use of less common items; rare spelling/word-formation errors.",
  9: "Full flexibility and precise use of a wide vocabulary range; only rare, minor 'slips'.",
};

export const WRITING_GRAMMAR: BandTable = {
  4: "Limited range of structures; subordinate clauses are rare; frequent errors may impede meaning.",
  5: "Limited range; complex sentences attempted but less accurate than simple ones; frequent errors that can impede meaning.",
  6: "Mix of simple and complex forms; grammatical errors persist but rarely impede communication.",
  7: "Variety of complex structures; frequent error-free sentences; good control with occasional errors.",
  8: "Wide range used flexibly; the majority of sentences are error-free; only occasional minor errors.",
  9: "Wide range with full flexibility and accuracy; only rare, minor 'slips'.",
};

export const SPEAKING_FLUENCY_COHERENCE: BandTable = {
  4: "Noticeable pauses and hesitation; speech may be slow with frequent repetition/self-correction; limited use of linking words.",
  5: "Speech may be slow with frequent repetition/self-correction; simple speech is fluent but complex communication causes hesitation; overuses certain connectives.",
  6: "Willing to speak at length, though may lose coherence at times from hesitation/repetition/self-correction; uses a range of connectives, not always appropriately.",
  7: "Speaks at length without noticeable effort or loss of coherence; occasional language-related hesitation or self-correction; some flexible use of connectives.",
  8: "Speaks fluently with only occasional repetition/self-correction, usually content- not language-related; develops topics coherently.",
  9: "Fluent with only rare repetition/self-correction; any hesitation is content-related, not language-related; fully appropriate cohesive features.",
};

export const SPEAKING_LEXICAL_RESOURCE: BandTable = {
  4: "Basic vocabulary used repetitively; limited ability to paraphrase.",
  5: "Enough vocabulary to discuss topics at length, but limited flexibility; attempts to paraphrase, not always successfully.",
  6: "Sufficient vocabulary to discuss topics at length; some less common/idiomatic vocabulary with occasional misuse; generally paraphrases successfully.",
  7: "Vocabulary resource for a variety of topics; some less common/idiomatic items with awareness of style/collocation, with occasional inappropriate choices; paraphrases effectively.",
  8: "Wide vocabulary used fluently and flexibly for precise meaning; skilful use of less common/idiomatic items; effective paraphrase as needed.",
  9: "Full, natural, flexible vocabulary used precisely; idiomatic language used naturally and accurately.",
};

export const SPEAKING_GRAMMAR: BandTable = {
  4: "Basic sentence forms with limited subordination; frequent errors that may cause misunderstanding.",
  5: "Basic range of structures; complex structures attempted but with limited accuracy; frequent errors though meaning is generally clear.",
  6: "Mix of simple and complex structures with limited flexibility; errors occur with complex structures but rarely impede communication.",
  7: "Range of complex structures with some flexibility; frequent error-free sentences though some errors persist.",
  8: "Wide range used flexibly; the majority of sentences are error-free; only occasional minor errors.",
  9: "Full flexibility and precise use of a wide range of structures; only rare, minor 'slips'.",
};

export const SPEAKING_PRONUNCIATION: BandTable = {
  4: "Limited range of pronunciation features; mispronunciations frequently cause difficulty for the listener.",
  5: "Some effective pronunciation features but not sustained; overall intelligible despite mispronunciations that sometimes reduce clarity.",
  6: "Mixed control of pronunciation features; generally understood throughout despite some mispronunciation.",
  7: "Good control of a range of pronunciation features, with some slips; easy to understand throughout, with minimal effect from L1 accent.",
  8: "Wide range of pronunciation features used effectively and flexibly, with only occasional lapses; easy to understand throughout.",
  9: "Full range of pronunciation features used precisely and subtly; effortless to understand throughout.",
};

function formatBandTable(name: string, table: BandTable): string {
  return [
    `### ${name}`,
    ...([4, 5, 6, 7, 8, 9] as const).map((band) => `- Band ${band}: ${table[band]}`),
  ].join("\n");
}

export function buildWritingRubricPrompt(taskType: "task1" | "task2"): string {
  const taskCriterion = taskType === "task1" ? WRITING_TASK_ACHIEVEMENT : WRITING_TASK_RESPONSE;
  const taskCriterionName = taskType === "task1" ? "Task Achievement" : "Task Response";
  return [
    formatBandTable(taskCriterionName, taskCriterion),
    formatBandTable("Coherence and Cohesion", WRITING_COHERENCE_COHESION),
    formatBandTable("Lexical Resource", WRITING_LEXICAL_RESOURCE),
    formatBandTable("Grammatical Range and Accuracy", WRITING_GRAMMAR),
  ].join("\n\n");
}

export function buildSpeakingRubricPrompt(): string {
  return [
    formatBandTable("Fluency and Coherence", SPEAKING_FLUENCY_COHERENCE),
    formatBandTable("Lexical Resource", SPEAKING_LEXICAL_RESOURCE),
    formatBandTable("Grammatical Range and Accuracy", SPEAKING_GRAMMAR),
    formatBandTable("Pronunciation", SPEAKING_PRONUNCIATION),
  ].join("\n\n");
}
