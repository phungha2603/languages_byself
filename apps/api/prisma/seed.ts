import { PrismaClient } from "@prisma/client";
import { CEFR_LEVEL_BY_STAGE, DEFAULT_IELTS_STAGES, type BandExitCriteria, type CefrLevel } from "@app/shared-types";

const prisma = new PrismaClient();

/**
 * Exit criteria get stricter at every stage: higher accuracy bars, more
 * required reps, tighter grammar tolerance. Tune these numbers once real
 * usage data comes in — they're reasonable starting defaults, not holy writ.
 */
function exitCriteriaFor(order: number): BandExitCriteria {
  const accuracy = 65 + order * 5;
  const exercises = 15 + order * 5;
  return {
    minSkillAccuracy: { listening: accuracy, speaking: accuracy, reading: accuracy, writing: accuracy },
    minExercisesPerSkill: { listening: exercises, speaking: exercises, reading: exercises, writing: exercises },
    minVocabRetention: 75 + order * 3,
    minMockAssessmentScore: 60 + order * 5,
    maxOpenGrammarWeaknesses: Math.max(1, 5 - order),
  };
}

interface SeedVocabEntry {
  headword: string;
  ipa: string;
  partOfSpeech: string;
  definitions: readonly string[];
  examples: readonly string[];
  vi: string;
}

/**
 * The CEFR-leveled vocabulary bank that powers the Vocabulary tab. Each IELTS stage's
 * curated list targets exactly one CEFR level (see CEFR_LEVEL_BY_STAGE) — 12 words per
 * level is enough for a first real study set without being a placeholder.
 */
const CEFR_VOCAB_BANK: Record<string, readonly SeedVocabEntry[]> = {
  foundation: [
    { headword: "family", ipa: "ˈfæməli", partOfSpeech: "noun", definitions: ["a group of people related by blood or marriage"], examples: ["My family lives in a small town."], vi: "gia đình" },
    { headword: "house", ipa: "haʊs", partOfSpeech: "noun", definitions: ["a building where people live"], examples: ["They bought a new house last year."], vi: "ngôi nhà" },
    { headword: "water", ipa: "ˈwɔːtər", partOfSpeech: "noun", definitions: ["a clear liquid that people drink"], examples: ["Please drink more water every day."], vi: "nước" },
    { headword: "friend", ipa: "frend", partOfSpeech: "noun", definitions: ["a person you know well and like"], examples: ["She is my best friend."], vi: "bạn" },
    { headword: "school", ipa: "skuːl", partOfSpeech: "noun", definitions: ["a place where children go to learn"], examples: ["He walks to school every morning."], vi: "trường học" },
    { headword: "happy", ipa: "ˈhæpi", partOfSpeech: "adjective", definitions: ["feeling or showing pleasure"], examples: ["I am happy to see you."], vi: "hạnh phúc" },
    { headword: "eat", ipa: "iːt", partOfSpeech: "verb", definitions: ["to put food in your mouth and swallow it"], examples: ["We eat dinner at seven o'clock."], vi: "ăn" },
    { headword: "work", ipa: "wɜːrk", partOfSpeech: "verb", definitions: ["to do a job"], examples: ["My father works in a bank."], vi: "làm việc" },
    { headword: "like", ipa: "laɪk", partOfSpeech: "verb", definitions: ["to enjoy or feel positive about something"], examples: ["I like reading books."], vi: "thích" },
    { headword: "big", ipa: "bɪɡ", partOfSpeech: "adjective", definitions: ["large in size"], examples: ["They live in a big house."], vi: "to, lớn" },
    { headword: "day", ipa: "deɪ", partOfSpeech: "noun", definitions: ["a period of twenty-four hours"], examples: ["Today is a beautiful day."], vi: "ngày" },
    { headword: "money", ipa: "ˈmʌni", partOfSpeech: "noun", definitions: ["coins and notes used to buy things"], examples: ["He doesn't have much money."], vi: "tiền" },
  ],
  "band-4-5": [
    { headword: "convenient", ipa: "kənˈviːniənt", partOfSpeech: "adjective", definitions: ["fitting in well with a person's needs, activities, and plans"], examples: ["Is it convenient to meet tomorrow?"], vi: "thuận tiện" },
    { headword: "decision", ipa: "dɪˈsɪʒn", partOfSpeech: "noun", definitions: ["a choice you make after thinking"], examples: ["She made the right decision."], vi: "quyết định" },
    { headword: "improve", ipa: "ɪmˈpruːv", partOfSpeech: "verb", definitions: ["to make or become better"], examples: ["He wants to improve his English."], vi: "cải thiện" },
    { headword: "opinion", ipa: "əˈpɪnjən", partOfSpeech: "noun", definitions: ["what you think about something"], examples: ["In my opinion, the film was great."], vi: "ý kiến" },
    { headword: "environment", ipa: "ɪnˈvaɪrənmənt", partOfSpeech: "noun", definitions: ["the natural world around us"], examples: ["We should protect the environment."], vi: "môi trường" },
    { headword: "prepare", ipa: "prɪˈpeər", partOfSpeech: "verb", definitions: ["to get ready for something"], examples: ["She is preparing for her exam."], vi: "chuẩn bị" },
    { headword: "include", ipa: "ɪnˈkluːd", partOfSpeech: "verb", definitions: ["to have something as part of a group or total"], examples: ["The price includes breakfast."], vi: "bao gồm" },
    { headword: "important", ipa: "ɪmˈpɔːrtənt", partOfSpeech: "adjective", definitions: ["having great value or effect"], examples: ["Sleep is important for your health."], vi: "quan trọng" },
    { headword: "explain", ipa: "ɪkˈspleɪn", partOfSpeech: "verb", definitions: ["to make something clear to someone"], examples: ["Can you explain this word to me?"], vi: "giải thích" },
    { headword: "compare", ipa: "kəmˈpeər", partOfSpeech: "verb", definitions: ["to look at the differences or similarities between things"], examples: ["Let's compare the two options."], vi: "so sánh" },
    { headword: "community", ipa: "kəˈmjuːnəti", partOfSpeech: "noun", definitions: ["a group of people living in the same area"], examples: ["The community helped after the storm."], vi: "cộng đồng" },
    { headword: "achieve", ipa: "əˈtʃiːv", partOfSpeech: "verb", definitions: ["to successfully complete or reach a goal"], examples: ["She achieved her dream of becoming a doctor."], vi: "đạt được" },
  ],
  "band-5-6": [
    { headword: "significant", ipa: "sɪɡˈnɪfɪkənt", partOfSpeech: "adjective", definitions: ["large or important enough to be noticed"], examples: ["There has been a significant increase in sales."], vi: "đáng kể" },
    { headword: "consequence", ipa: "ˈkɒnsɪkwəns", partOfSpeech: "noun", definitions: ["a result or effect of an action or condition"], examples: ["He didn't think about the consequences of his decision."], vi: "hậu quả" },
    { headword: "beneficial", ipa: "ˌbenɪˈfɪʃl", partOfSpeech: "adjective", definitions: ["producing good results; favourable"], examples: ["Regular exercise is beneficial to your health."], vi: "có lợi" },
    { headword: "encounter", ipa: "ɪnˈkaʊntər", partOfSpeech: "verb", definitions: ["to meet or experience something, often unexpectedly"], examples: ["We encountered many problems on the trip."], vi: "gặp phải" },
    { headword: "tendency", ipa: "ˈtendənsi", partOfSpeech: "noun", definitions: ["a way of behaving that happens often"], examples: ["She has a tendency to arrive late."], vi: "xu hướng" },
    { headword: "contribute", ipa: "kənˈtrɪbjuːt", partOfSpeech: "verb", definitions: ["to give something in order to help achieve a result"], examples: ["Everyone contributed ideas to the project."], vi: "đóng góp" },
    { headword: "essential", ipa: "ɪˈsenʃl", partOfSpeech: "adjective", definitions: ["absolutely necessary; extremely important"], examples: ["Clean water is essential for survival."], vi: "thiết yếu" },
    { headword: "analyze", ipa: "ˈænəlaɪz", partOfSpeech: "verb", definitions: ["to examine something carefully in detail"], examples: ["Scientists analyzed the data closely."], vi: "phân tích" },
    { headword: "phenomenon", ipa: "fəˈnɒmɪnən", partOfSpeech: "noun", definitions: ["a fact or event, especially one that is unusual"], examples: ["Climate change is a global phenomenon."], vi: "hiện tượng" },
    { headword: "perspective", ipa: "pəˈspektɪv", partOfSpeech: "noun", definitions: ["a particular way of viewing things"], examples: ["Try to see it from her perspective."], vi: "góc nhìn" },
    { headword: "sustainable", ipa: "səˈsteɪnəbl", partOfSpeech: "adjective", definitions: ["able to continue over a long period without causing harm"], examples: ["We need sustainable solutions for energy."], vi: "bền vững" },
    { headword: "accurate", ipa: "ˈækjərət", partOfSpeech: "adjective", definitions: ["correct and exact, especially as a result of care"], examples: ["Please give me an accurate description."], vi: "chính xác" },
  ],
  "band-6-7": [
    { headword: "ambiguous", ipa: "æmˈbɪɡjuəs", partOfSpeech: "adjective", definitions: ["having more than one possible meaning"], examples: ["His answer was rather ambiguous."], vi: "mơ hồ" },
    { headword: "controversial", ipa: "ˌkɒntrəˈvɜːʃl", partOfSpeech: "adjective", definitions: ["causing strong disagreement or public argument"], examples: ["It was a controversial decision."], vi: "gây tranh cãi" },
    { headword: "inevitable", ipa: "ɪnˈevɪtəbl", partOfSpeech: "adjective", definitions: ["certain to happen; unavoidable"], examples: ["Change is inevitable in a growing economy."], vi: "không thể tránh khỏi" },
    { headword: "comprehensive", ipa: "ˌkɒmprɪˈhensɪv", partOfSpeech: "adjective", definitions: ["complete and including everything that is necessary"], examples: ["The report gives a comprehensive overview."], vi: "toàn diện" },
    { headword: "hypothesis", ipa: "haɪˈpɒθəsɪs", partOfSpeech: "noun", definitions: ["an idea that is suggested as an explanation but not yet proved"], examples: ["The scientist tested her hypothesis."], vi: "giả thuyết" },
    { headword: "mitigate", ipa: "ˈmɪtɪɡeɪt", partOfSpeech: "verb", definitions: ["to make something less severe, serious, or painful"], examples: ["New laws aim to mitigate pollution."], vi: "giảm nhẹ" },
    { headword: "undermine", ipa: "ˌʌndərˈmaɪn", partOfSpeech: "verb", definitions: ["to weaken something gradually, often secretly"], examples: ["Corruption undermines public trust."], vi: "làm suy yếu" },
    { headword: "coherent", ipa: "koʊˈhɪərənt", partOfSpeech: "adjective", definitions: ["logical and well organized; easy to follow"], examples: ["She gave a coherent explanation of the plan."], vi: "mạch lạc" },
    { headword: "substantial", ipa: "səbˈstænʃl", partOfSpeech: "adjective", definitions: ["large in amount, value, or importance"], examples: ["There was a substantial improvement in sales."], vi: "đáng kể, lớn" },
    { headword: "versatile", ipa: "ˈvɜːrsətl", partOfSpeech: "adjective", definitions: ["able to adapt or be adapted to many different functions"], examples: ["She is a versatile musician."], vi: "đa năng" },
    { headword: "legitimate", ipa: "lɪˈdʒɪtɪmət", partOfSpeech: "adjective", definitions: ["conforming to the law or reasonable standards; fair"], examples: ["He raised a legitimate concern."], vi: "chính đáng" },
    { headword: "discrepancy", ipa: "dɪsˈkrepənsi", partOfSpeech: "noun", definitions: ["a difference between things that should be the same"], examples: ["There is a discrepancy between the two reports."], vi: "sự khác biệt" },
  ],
  "band-7-8": [
    { headword: "ubiquitous", ipa: "juːˈbɪkwɪtəs", partOfSpeech: "adjective", definitions: ["present, appearing, or found everywhere"], examples: ["Smartphones have become ubiquitous in modern life."], vi: "có mặt khắp nơi" },
    { headword: "meticulous", ipa: "məˈtɪkjələs", partOfSpeech: "adjective", definitions: ["showing great attention to detail; very careful and precise"], examples: ["She is meticulous in her research."], vi: "tỉ mỉ" },
    { headword: "pragmatic", ipa: "præɡˈmætɪk", partOfSpeech: "adjective", definitions: ["dealing with things in a sensible, practical way"], examples: ["We need a pragmatic approach to the problem."], vi: "thực dụng" },
    { headword: "nuanced", ipa: "ˈnjuːɑːnst", partOfSpeech: "adjective", definitions: ["characterized by subtle shades of meaning or feeling"], examples: ["He gave a nuanced analysis of the issue."], vi: "tinh tế, nhiều sắc thái" },
    { headword: "paradox", ipa: "ˈpærədɒks", partOfSpeech: "noun", definitions: ["a situation or statement that seems to contain contradictory elements"], examples: ["It's a paradox that wealthier countries sometimes waste more."], vi: "nghịch lý" },
    { headword: "detrimental", ipa: "ˌdetrɪˈmentl", partOfSpeech: "adjective", definitions: ["tending to cause harm or damage"], examples: ["Excessive stress can be detrimental to health."], vi: "có hại" },
    { headword: "empirical", ipa: "ɪmˈpɪrɪkl", partOfSpeech: "adjective", definitions: ["based on observation or experiment rather than theory"], examples: ["The theory lacks empirical evidence."], vi: "thực nghiệm" },
    { headword: "proliferation", ipa: "prəˌlɪfəˈreɪʃn", partOfSpeech: "noun", definitions: ["a rapid increase in the number or amount of something"], examples: ["The proliferation of social media changed communication."], vi: "sự gia tăng nhanh chóng" },
    { headword: "discern", ipa: "dɪˈsɜːrn", partOfSpeech: "verb", definitions: ["to recognize or notice something that is not obvious"], examples: ["It was hard to discern his true intentions."], vi: "nhận ra, phân biệt" },
    { headword: "advocate", ipa: "ˈædvəkeɪt", partOfSpeech: "verb", definitions: ["to publicly support or recommend a particular policy or idea"], examples: ["She advocates for stricter environmental laws."], vi: "ủng hộ, biện hộ" },
    { headword: "intrinsic", ipa: "ɪnˈtrɪnsɪk", partOfSpeech: "adjective", definitions: ["belonging naturally to something; essential"], examples: ["Curiosity is an intrinsic part of human nature."], vi: "vốn có" },
    { headword: "dichotomy", ipa: "daɪˈkɒtəmi", partOfSpeech: "noun", definitions: ["a division or contrast between two things that are opposed"], examples: ["There's a dichotomy between theory and practice."], vi: "sự phân đôi, đối lập" },
  ],
};

/** A handful of hand-written sample exercises so a fresh install has something to practice immediately. */
const SAMPLE_EXERCISES = [
  {
    type: "listening_mcq" as const,
    skill: "listening" as const,
    stageId: "foundation",
    difficulty: 2,
    prompt: "Listen to the short announcement and choose what time the shop closes.",
    content: { options: ["6 PM", "8 PM", "9 PM", "10 PM"] },
    answerKey: { correctIndex: 2 },
  },
  {
    type: "reading_mcq" as const,
    skill: "reading" as const,
    stageId: "foundation",
    difficulty: 2,
    prompt:
      "Read: 'Many cities are now encouraging cycling instead of driving, as it reduces traffic and pollution while improving public health.' According to the passage, what is one benefit of cycling mentioned?",
    content: { options: ["It is faster than driving", "It reduces pollution", "It is required by law", "It saves money on fuel"] },
    answerKey: { correctIndex: 1 },
  },
  {
    type: "speaking_cue_card" as const,
    skill: "speaking" as const,
    stageId: "foundation",
    difficulty: 3,
    prompt:
      "Describe a place you like to visit in your free time. You should say: where it is, how often you go there, what you do there, and explain why you like it.",
    content: { part: "part2" },
    answerKey: {},
  },
  {
    type: "writing_task2_essay" as const,
    skill: "writing" as const,
    stageId: "foundation",
    difficulty: 3,
    prompt:
      "Some people believe that students should choose their own subjects at school, while others think the school should decide. Discuss both views and give your own opinion.",
    content: { taskType: "task2" },
    answerKey: {},
  },
] as const;

async function main() {
  for (const stage of DEFAULT_IELTS_STAGES) {
    await prisma.ieltsStage.upsert({
      where: { id: stage.id },
      update: {
        order: stage.order,
        label: stage.label,
        minBand: stage.minBand,
        maxBand: stage.maxBand,
        description: stage.description,
        exitCriteria: { ...exitCriteriaFor(stage.order) },
      },
      create: {
        id: stage.id,
        order: stage.order,
        label: stage.label,
        minBand: stage.minBand,
        maxBand: stage.maxBand,
        description: stage.description,
        exitCriteria: { ...exitCriteriaFor(stage.order) },
      },
    });
  }
  console.log(`Seeded ${DEFAULT_IELTS_STAGES.length} IELTS stages.`);

  let vocabCount = 0;
  for (const [stageId, words] of Object.entries(CEFR_VOCAB_BANK)) {
    const cefrLevel = CEFR_LEVEL_BY_STAGE[stageId] as CefrLevel;
    for (const word of words) {
      const existing = await prisma.vocabItem.findFirst({ where: { headword: word.headword } });
      const data = {
        headword: word.headword,
        ipa: word.ipa,
        partOfSpeech: word.partOfSpeech,
        definitions: [...word.definitions],
        examples: [...word.examples],
        translations: { vi: word.vi },
        cefrLevel,
        stageIds: [stageId],
      };
      if (existing) {
        await prisma.vocabItem.update({ where: { id: existing.id }, data });
      } else {
        await prisma.vocabItem.create({ data });
      }
      vocabCount += 1;
    }
  }
  console.log(`Seeded ${vocabCount} CEFR-leveled vocabulary items across ${Object.keys(CEFR_VOCAB_BANK).length} stages.`);

  for (const exercise of SAMPLE_EXERCISES) {
    const existing = await prisma.exercise.findFirst({ where: { prompt: exercise.prompt } });
    if (existing) continue;
    await prisma.exercise.create({
      data: {
        type: exercise.type,
        skill: exercise.skill,
        stageId: exercise.stageId,
        difficulty: exercise.difficulty,
        prompt: exercise.prompt,
        content: exercise.content,
        grammarTopics: [],
        vocabIds: [],
        answerKey: exercise.answerKey,
      },
    });
  }
  console.log(`Seeded ${SAMPLE_EXERCISES.length} sample exercises.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
