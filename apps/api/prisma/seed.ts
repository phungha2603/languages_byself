import { PrismaClient } from "@prisma/client";
import { DEFAULT_IELTS_STAGES, type BandExitCriteria } from "@app/shared-types";

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

/**
 * The Vocabulary tab's own 4-level progression, independent of the IELTS roadmap stages above:
 * a learner starts at whichever level matches the IELTS band they're aiming for (see
 * resolveAnchorVocabLevel in shared-types), not necessarily at the bottom. Framed as an
 * "expedition" so the 4 levels read as one continuous story rather than 4 disconnected lists.
 */
const VOCAB_LEVELS_SEED = [
  {
    id: "b1",
    order: 0,
    cefrLevel: "B1",
    minBand: 4.0,
    maxBand: 5.0,
    bandLabel: "4.0 – 5.0",
    storyTitle: "Part I — The Trailhead",
    description:
      "Your expedition begins at base camp: everyday objects, food, work and the news from town — the vocabulary every traveller needs before setting out.",
  },
  {
    id: "b2",
    order: 1,
    cefrLevel: "B2",
    minBand: 5.5,
    maxBand: 6.5,
    bandLabel: "5.5 – 6.5",
    storyTitle: "Part II — Into the Highlands",
    description:
      "The path steepens. Careers, world affairs and more demanding topics test a traveller who has moved beyond the basics.",
  },
  {
    id: "c1",
    order: 2,
    cefrLevel: "C1",
    minBand: 7.0,
    maxBand: 8.0,
    bandLabel: "7.0 – 8.0",
    storyTitle: "Part III — The Academic Ridge",
    description:
      "Thin air, sharp focus. Character, justice, research and nuance — the register IELTS examiners reward most.",
  },
  {
    id: "c2",
    order: 3,
    cefrLevel: "C2",
    minBand: 8.5,
    maxBand: 9.0,
    bandLabel: "8.5 – 9.0",
    storyTitle: "Part IV — The Summit",
    description:
      "The final ascent: precision, rhetoric and native-like nuance — the vocabulary of someone who has truly mastered the language.",
  },
] as const;

interface SeedVocabEntry {
  headword: string;
  ipa: string;
  partOfSpeech: string;
  definitions: readonly string[];
  examples: readonly string[];
  vi: string;
}

/**
 * The curated vocabulary bank: vocabLevelId -> chapter -> words, ordered easy -> hard both
 * within each chapter and across the 4 chapters of a level. Headwords and their CEFR levels
 * are sourced from two free, published datasets rather than invented:
 *   - B1/B2: The CEFR-J Vocabulary Profile v1.5 (Tono Laboratory, TUFS) —
 *     github.com/openlanguageprofiles/olp-en-cefrj — including its topic categories, which
 *     the 4 chapters per level below are built directly from.
 *   - C1/C2: The Octanove Vocabulary Profile for C1/C2 (Octanove Labs, CC BY-SA 4.0), published
 *     in the same repository, chaptered by semantic grouping (no topic field in that dataset).
 * Definitions, examples and Vietnamese translations are hand-written for this app.
 */
const CEFR_VOCAB_BANK: Record<string, Record<string, readonly SeedVocabEntry[]>> = {
  b1: {
    "Base Camp Supplies": [
      { headword: "backpack", ipa: "ˈbækpæk", partOfSpeech: "noun", definitions: ["a bag carried on the back, used for carrying things"], examples: ["She packed her backpack for the hiking trip."], vi: "ba lô" },
      { headword: "basement", ipa: "ˈbeɪsmənt", partOfSpeech: "noun", definitions: ["the floor of a building that is below ground level"], examples: ["They store old furniture in the basement."], vi: "tầng hầm" },
      { headword: "candle", ipa: "ˈkændl", partOfSpeech: "noun", definitions: ["a stick of wax with a wick, burned to give light"], examples: ["We lit a candle during the power cut."], vi: "cây nến" },
      { headword: "carpet", ipa: "ˈkɑːrpɪt", partOfSpeech: "noun", definitions: ["a thick fabric covering used on floors"], examples: ["The living room has a soft blue carpet."], vi: "thảm" },
      { headword: "device", ipa: "dɪˈvaɪs", partOfSpeech: "noun", definitions: ["a machine or tool made for a particular purpose"], examples: ["This device measures your heart rate."], vi: "thiết bị" },
      { headword: "freezer", ipa: "ˈfriːzər", partOfSpeech: "noun", definitions: ["an appliance that keeps food frozen"], examples: ["Put the meat in the freezer for later."], vi: "tủ đông" },
      { headword: "keyboard", ipa: "ˈkiːbɔːrd", partOfSpeech: "noun", definitions: ["a set of keys used to type on a computer"], examples: ["She typed quickly on the keyboard."], vi: "bàn phím" },
      { headword: "pillow", ipa: "ˈpɪloʊ", partOfSpeech: "noun", definitions: ["a soft cushion used to rest your head on"], examples: ["He fluffed up his pillow before sleeping."], vi: "cái gối" },
      { headword: "tissue", ipa: "ˈtɪʃuː", partOfSpeech: "noun", definitions: ["a soft piece of paper used for wiping or blowing your nose"], examples: ["She handed him a tissue."], vi: "khăn giấy" },
      { headword: "hammer", ipa: "ˈhæmər", partOfSpeech: "noun", definitions: ["a tool used for hitting nails"], examples: ["He used a hammer to fix the shelf."], vi: "cái búa" },
    ],
    "The Trailhead Kitchen": [
      { headword: "appetite", ipa: "ˈæpɪtaɪt", partOfSpeech: "noun", definitions: ["a feeling of wanting to eat"], examples: ["The long walk gave him a big appetite."], vi: "sự thèm ăn" },
      { headword: "bacon", ipa: "ˈbeɪkən", partOfSpeech: "noun", definitions: ["salted or smoked meat from a pig"], examples: ["She fried bacon and eggs for breakfast."], vi: "thịt xông khói" },
      { headword: "cucumber", ipa: "ˈkjuːkʌmbər", partOfSpeech: "noun", definitions: ["a long green vegetable eaten raw in salads"], examples: ["He sliced cucumber into the salad."], vi: "dưa chuột" },
      { headword: "ingredient", ipa: "ɪnˈɡriːdiənt", partOfSpeech: "noun", definitions: ["one of the foods used to make a dish"], examples: ["Flour is the main ingredient in bread."], vi: "nguyên liệu" },
      { headword: "pineapple", ipa: "ˈpaɪnæpl", partOfSpeech: "noun", definitions: ["a large tropical fruit with spiky skin"], examples: ["She bought a fresh pineapple at the market."], vi: "quả dứa" },
      { headword: "spice", ipa: "spaɪs", partOfSpeech: "noun", definitions: ["a substance used to flavour food"], examples: ["The curry had a strong spice flavour."], vi: "gia vị" },
      { headword: "strawberry", ipa: "ˈstrɔːberi", partOfSpeech: "noun", definitions: ["a small red fruit with seeds on its skin"], examples: ["They picked strawberries in the garden."], vi: "dâu tây" },
      { headword: "taste", ipa: "teɪst", partOfSpeech: "noun", definitions: ["the flavour of food in the mouth"], examples: ["This soup has a rich, salty taste."], vi: "vị, hương vị" },
      { headword: "broccoli", ipa: "ˈbrɒkəli", partOfSpeech: "noun", definitions: ["a green vegetable with a thick stem and small flower heads"], examples: ["He steamed some broccoli for dinner."], vi: "bông cải xanh" },
      { headword: "nutrition", ipa: "njuːˈtrɪʃn", partOfSpeech: "noun", definitions: ["the process of eating the right food for health"], examples: ["Good nutrition keeps your body strong."], vi: "dinh dưỡng" },
    ],
    "Guides & Porters": [
      { headword: "accountant", ipa: "əˈkaʊntənt", partOfSpeech: "noun", definitions: ["a person whose job is to keep financial records"], examples: ["The accountant checked the company's accounts."], vi: "kế toán viên" },
      { headword: "architect", ipa: "ˈɑːrkɪtekt", partOfSpeech: "noun", definitions: ["a person who designs buildings"], examples: ["The architect designed a modern office building."], vi: "kiến trúc sư" },
      { headword: "career", ipa: "kəˈrɪər", partOfSpeech: "noun", definitions: ["the jobs a person does throughout their life"], examples: ["She built a successful career in medicine."], vi: "sự nghiệp" },
      { headword: "employment", ipa: "ɪmˈplɔɪmənt", partOfSpeech: "noun", definitions: ["the state of having paid work"], examples: ["The factory offers employment to local workers."], vi: "việc làm" },
      { headword: "firefighter", ipa: "ˈfaɪərfaɪtər", partOfSpeech: "noun", definitions: ["a person whose job is to put out fires"], examples: ["The firefighter rescued the family from the burning house."], vi: "lính cứu hỏa" },
      { headword: "journalist", ipa: "ˈdʒɜːrnəlɪst", partOfSpeech: "noun", definitions: ["a person who writes news reports"], examples: ["The journalist interviewed the mayor."], vi: "nhà báo" },
      { headword: "mechanic", ipa: "məˈkænɪk", partOfSpeech: "noun", definitions: ["a person who repairs machines or vehicles"], examples: ["The mechanic fixed the car's engine."], vi: "thợ máy" },
      { headword: "profession", ipa: "prəˈfeʃn", partOfSpeech: "noun", definitions: ["a job that needs special training"], examples: ["Teaching is a respected profession."], vi: "nghề nghiệp" },
      { headword: "specialist", ipa: "ˈspeʃəlɪst", partOfSpeech: "noun", definitions: ["a person with expert knowledge in one area"], examples: ["She saw a specialist about her injury."], vi: "chuyên gia" },
      { headword: "workplace", ipa: "ˈwɜːrkpleɪs", partOfSpeech: "noun", definitions: ["the place where someone works"], examples: ["The company improved safety in the workplace."], vi: "nơi làm việc" },
    ],
    "News from Camp": [
      { headword: "crisis", ipa: "ˈkraɪsɪs", partOfSpeech: "noun", definitions: ["a time of great danger or difficulty"], examples: ["The country faced an economic crisis."], vi: "khủng hoảng" },
      { headword: "democracy", ipa: "dɪˈmɒkrəsi", partOfSpeech: "noun", definitions: ["a system of government chosen by the people"], examples: ["The nation transitioned to democracy."], vi: "nền dân chủ" },
      { headword: "disaster", ipa: "dɪˈzæstər", partOfSpeech: "noun", definitions: ["a sudden event that causes great damage"], examples: ["The flood was a natural disaster."], vi: "thảm họa" },
      { headword: "election", ipa: "ɪˈlekʃn", partOfSpeech: "noun", definitions: ["a process of choosing leaders by voting"], examples: ["The election will be held next month."], vi: "cuộc bầu cử" },
      { headword: "poverty", ipa: "ˈpɒvərti", partOfSpeech: "noun", definitions: ["the state of being very poor"], examples: ["The charity works to reduce poverty."], vi: "nghèo đói" },
      { headword: "prison", ipa: "ˈprɪzn", partOfSpeech: "noun", definitions: ["a place where criminals are kept"], examples: ["He was sent to prison for theft."], vi: "nhà tù" },
      { headword: "threat", ipa: "θret", partOfSpeech: "noun", definitions: ["a statement or sign of possible harm"], examples: ["Pollution is a threat to wildlife."], vi: "mối đe dọa" },
      { headword: "victim", ipa: "ˈvɪktɪm", partOfSpeech: "noun", definitions: ["a person harmed by an event or crime"], examples: ["The victim was taken to hospital."], vi: "nạn nhân" },
      { headword: "violence", ipa: "ˈvaɪələns", partOfSpeech: "noun", definitions: ["behaviour that causes physical harm"], examples: ["The film shows scenes of violence."], vi: "bạo lực" },
      { headword: "policy", ipa: "ˈpɒləsi", partOfSpeech: "noun", definitions: ["a plan of action by a government or organisation"], examples: ["The government introduced a new tax policy."], vi: "chính sách" },
    ],
  },
  b2: {
    "The Highland Lodge": [
      { headword: "ceiling", ipa: "ˈsiːlɪŋ", partOfSpeech: "noun", definitions: ["the inside roof of a room"], examples: ["A lamp hung from the ceiling."], vi: "trần nhà" },
      { headword: "cellar", ipa: "ˈselər", partOfSpeech: "noun", definitions: ["an underground room used for storage"], examples: ["They kept wine in the cellar."], vi: "hầm chứa đồ" },
      { headword: "fireplace", ipa: "ˈfaɪərpleɪs", partOfSpeech: "noun", definitions: ["an open space in a wall for a fire"], examples: ["They sat by the fireplace to keep warm."], vi: "lò sưởi" },
      { headword: "label", ipa: "ˈleɪbl", partOfSpeech: "noun", definitions: ["a small piece of paper giving information about an item"], examples: ["Check the label for washing instructions."], vi: "nhãn mác" },
      { headword: "laptop", ipa: "ˈlæptɒp", partOfSpeech: "noun", definitions: ["a small portable computer"], examples: ["She works on her laptop every day."], vi: "máy tính xách tay" },
      { headword: "ornament", ipa: "ˈɔːrnəmənt", partOfSpeech: "noun", definitions: ["an object used for decoration"], examples: ["A glass ornament sat on the shelf."], vi: "đồ trang trí" },
      { headword: "outfit", ipa: "ˈaʊtfɪt", partOfSpeech: "noun", definitions: ["a set of clothes worn together"], examples: ["She chose a smart outfit for the interview."], vi: "bộ trang phục" },
      { headword: "pin", ipa: "pɪn", partOfSpeech: "noun", definitions: ["a thin, pointed piece of metal used to fasten things"], examples: ["She used a pin to hold the fabric together."], vi: "cái ghim" },
      { headword: "rug", ipa: "rʌɡ", partOfSpeech: "noun", definitions: ["a small carpet covering part of a floor"], examples: ["A colourful rug lay in front of the sofa."], vi: "tấm thảm nhỏ" },
      { headword: "implement", ipa: "ˈɪmplɪmənt", partOfSpeech: "noun", definitions: ["a tool or instrument used for a task"], examples: ["Farmers used simple implements to plough the field."], vi: "công cụ, dụng cụ" },
    ],
    "Flavours of the Journey": [
      { headword: "cocktail", ipa: "ˈkɒkteɪl", partOfSpeech: "noun", definitions: ["a mixed alcoholic drink"], examples: ["They ordered cocktails at the bar."], vi: "cocktail" },
      { headword: "cocoa", ipa: "ˈkoʊkoʊ", partOfSpeech: "noun", definitions: ["a powder made from cacao seeds, used in chocolate"], examples: ["She made hot cocoa on a cold evening."], vi: "bột ca cao" },
      { headword: "coconut", ipa: "ˈkoʊkənʌt", partOfSpeech: "noun", definitions: ["a large brown tropical fruit with white flesh"], examples: ["He drank fresh coconut water on the beach."], vi: "quả dừa" },
      { headword: "grain", ipa: "ɡreɪn", partOfSpeech: "noun", definitions: ["the small hard seeds of food crops like wheat or rice"], examples: ["Rice is a staple grain in many countries."], vi: "hạt ngũ cốc" },
      { headword: "mango", ipa: "ˈmæŋɡoʊ", partOfSpeech: "noun", definitions: ["a sweet tropical fruit with orange flesh"], examples: ["She sliced a ripe mango for dessert."], vi: "quả xoài" },
      { headword: "peach", ipa: "piːtʃ", partOfSpeech: "noun", definitions: ["a soft, round fruit with fuzzy pink-orange skin"], examples: ["He picked a ripe peach from the tree."], vi: "quả đào" },
      { headword: "pickle", ipa: "ˈpɪkl", partOfSpeech: "noun", definitions: ["a vegetable preserved in vinegar or salt water"], examples: ["She added pickle to her sandwich."], vi: "dưa chua, đồ ngâm" },
      { headword: "recipe", ipa: "ˈresəpi", partOfSpeech: "noun", definitions: ["a set of instructions for preparing a dish"], examples: ["My grandmother gave me her recipe for soup."], vi: "công thức nấu ăn" },
      { headword: "stew", ipa: "stjuː", partOfSpeech: "noun", definitions: ["a dish of meat and vegetables cooked slowly in liquid"], examples: ["We ate a hearty beef stew for dinner."], vi: "món hầm" },
      { headword: "nourishment", ipa: "ˈnʌrɪʃmənt", partOfSpeech: "noun", definitions: ["food that keeps a person healthy"], examples: ["Fresh vegetables provide important nourishment."], vi: "sự nuôi dưỡng, dinh dưỡng" },
    ],
    "Fellow Travellers": [
      { headword: "client", ipa: "ˈklaɪənt", partOfSpeech: "noun", definitions: ["a person who uses the services of a professional"], examples: ["The lawyer met with a new client."], vi: "khách hàng" },
      { headword: "colleague", ipa: "ˈkɒliːɡ", partOfSpeech: "noun", definitions: ["a person you work with"], examples: ["My colleague helped me finish the report."], vi: "đồng nghiệp" },
      { headword: "contract", ipa: "ˈkɒntrækt", partOfSpeech: "noun", definitions: ["a written legal agreement"], examples: ["They signed a contract for the new project."], vi: "hợp đồng" },
      { headword: "employer", ipa: "ɪmˈplɔɪər", partOfSpeech: "noun", definitions: ["a person or company that pays others to work"], examples: ["Her employer gave her a pay rise."], vi: "người sử dụng lao động" },
      { headword: "enterprise", ipa: "ˈentərpraɪz", partOfSpeech: "noun", definitions: ["a company or business, especially a new one"], examples: ["He started a small enterprise selling crafts."], vi: "doanh nghiệp" },
      { headword: "executive", ipa: "ɪɡˈzekjətɪv", partOfSpeech: "noun", definitions: ["a senior manager in a company"], examples: ["She was promoted to senior executive."], vi: "giám đốc điều hành" },
      { headword: "interpreter", ipa: "ɪnˈtɜːrprɪtər", partOfSpeech: "noun", definitions: ["a person who translates spoken language"], examples: ["The interpreter helped the tourists communicate."], vi: "thông dịch viên" },
      { headword: "investment", ipa: "ɪnˈvestmənt", partOfSpeech: "noun", definitions: ["money put into something to earn a profit"], examples: ["Buying this property was a wise investment."], vi: "khoản đầu tư" },
      { headword: "salary", ipa: "ˈsæləri", partOfSpeech: "noun", definitions: ["a fixed regular payment for work"], examples: ["He negotiated a higher salary."], vi: "tiền lương" },
      { headword: "supervisor", ipa: "ˈsuːpərvaɪzər", partOfSpeech: "noun", definitions: ["a person who oversees others' work"], examples: ["Her supervisor reviewed the team's progress."], vi: "người giám sát" },
    ],
    "Dispatches from Afar": [
      { headword: "addiction", ipa: "əˈdɪkʃn", partOfSpeech: "noun", definitions: ["a strong need to do or use something harmful"], examples: ["He sought help to overcome his addiction."], vi: "chứng nghiện" },
      { headword: "alliance", ipa: "əˈlaɪəns", partOfSpeech: "noun", definitions: ["a formal agreement between groups or countries"], examples: ["The two nations formed a military alliance."], vi: "liên minh" },
      { headword: "bankruptcy", ipa: "ˈbæŋkrʌptsi", partOfSpeech: "noun", definitions: ["the state of having no money to pay debts"], examples: ["The company declared bankruptcy last year."], vi: "sự phá sản" },
      { headword: "barrier", ipa: "ˈbæriər", partOfSpeech: "noun", definitions: ["something that prevents progress or movement"], examples: ["Language can be a barrier to communication."], vi: "rào cản" },
      { headword: "legislation", ipa: "ˌledʒɪsˈleɪʃn", partOfSpeech: "noun", definitions: ["laws considered as a group"], examples: ["New legislation aims to reduce emissions."], vi: "luật pháp" },
      { headword: "minister", ipa: "ˈmɪnɪstər", partOfSpeech: "noun", definitions: ["a senior member of a government"], examples: ["The foreign minister visited several countries."], vi: "bộ trưởng" },
      { headword: "reform", ipa: "rɪˈfɔːrm", partOfSpeech: "noun", definitions: ["a change made to improve a system"], examples: ["The government proposed education reform."], vi: "cải cách" },
      { headword: "refugee", ipa: "ˌrefjuˈdʒiː", partOfSpeech: "noun", definitions: ["a person forced to leave their country"], examples: ["The charity supports refugees arriving in the city."], vi: "người tị nạn" },
      { headword: "treaty", ipa: "ˈtriːti", partOfSpeech: "noun", definitions: ["a formal agreement between countries"], examples: ["The two countries signed a peace treaty."], vi: "hiệp ước" },
      { headword: "voter", ipa: "ˈvoʊtər", partOfSpeech: "noun", definitions: ["a person who votes in an election"], examples: ["Voters lined up outside the polling station."], vi: "cử tri" },
    ],
  },
  c1: {
    "Reading Your Companions": [
      { headword: "candid", ipa: "ˈkændɪd", partOfSpeech: "adjective", definitions: ["honest and direct, even if unwelcome"], examples: ["He gave a candid assessment of the plan."], vi: "thẳng thắn" },
      { headword: "conscientious", ipa: "ˌkɒnʃiˈenʃəs", partOfSpeech: "adjective", definitions: ["careful to do things correctly and thoroughly"], examples: ["She is a conscientious student who checks her work."], vi: "tận tâm, cẩn thận" },
      { headword: "docile", ipa: "ˈdoʊsaɪl", partOfSpeech: "adjective", definitions: ["easy to control or teach; gentle"], examples: ["The dog was docile and obedient."], vi: "dễ bảo, hiền lành" },
      { headword: "eccentric", ipa: "ɪkˈsentrɪk", partOfSpeech: "adjective", definitions: ["unconventional or slightly strange in behaviour"], examples: ["Her eccentric uncle collected old clocks."], vi: "lập dị" },
      { headword: "insightful", ipa: "ˈɪnsaɪtfl", partOfSpeech: "adjective", definitions: ["showing clear and deep understanding"], examples: ["He made an insightful comment about the film."], vi: "sâu sắc" },
      { headword: "resilient", ipa: "rɪˈzɪliənt", partOfSpeech: "adjective", definitions: ["able to recover quickly from difficulty"], examples: ["Children can be remarkably resilient."], vi: "kiên cường, có khả năng phục hồi" },
      { headword: "ruthless", ipa: "ˈruːθləs", partOfSpeech: "adjective", definitions: ["having no pity for others; harsh"], examples: ["The ruthless businessman cut hundreds of jobs."], vi: "tàn nhẫn" },
      { headword: "temperament", ipa: "ˈtemprəmənt", partOfSpeech: "noun", definitions: ["a person's typical nature or mood"], examples: ["She has a calm temperament."], vi: "tính khí" },
      { headword: "versatile", ipa: "ˈvɜːrsətl", partOfSpeech: "adjective", definitions: ["able to adapt to many different functions"], examples: ["He is a versatile actor who plays many roles."], vi: "đa năng" },
      { headword: "wary", ipa: "ˈweəri", partOfSpeech: "adjective", definitions: ["cautious about possible danger"], examples: ["She was wary of strangers at night."], vi: "thận trọng, cảnh giác" },
    ],
    "Matters of Justice": [
      { headword: "bribery", ipa: "ˈbraɪbəri", partOfSpeech: "noun", definitions: ["the act of giving money to influence someone illegally"], examples: ["The official was arrested for bribery."], vi: "hối lộ" },
      { headword: "deprivation", ipa: "ˌdeprɪˈveɪʃn", partOfSpeech: "noun", definitions: ["the state of lacking basic necessities"], examples: ["Years of deprivation left the region struggling."], vi: "sự thiếu thốn" },
      { headword: "exploitation", ipa: "ˌeksplɔɪˈteɪʃn", partOfSpeech: "noun", definitions: ["the unfair use of someone for one's own benefit"], examples: ["The report exposed the exploitation of factory workers."], vi: "sự bóc lột" },
      { headword: "harassment", ipa: "həˈræsmənt", partOfSpeech: "noun", definitions: ["aggressive pressure or intimidation"], examples: ["The company has a strict policy against harassment."], vi: "quấy rối" },
      { headword: "hypocrisy", ipa: "hɪˈpɒkrəsi", partOfSpeech: "noun", definitions: ["behaviour that contradicts one's stated beliefs"], examples: ["Critics accused the politician of hypocrisy."], vi: "sự đạo đức giả" },
      { headword: "injustice", ipa: "ɪnˈdʒʌstɪs", partOfSpeech: "noun", definitions: ["unfair treatment"], examples: ["They protested against racial injustice."], vi: "sự bất công" },
      { headword: "legacy", ipa: "ˈleɡəsi", partOfSpeech: "noun", definitions: ["something left behind from the past"], examples: ["The president left a lasting legacy."], vi: "di sản" },
      { headword: "persecution", ipa: "ˌpɜːrsɪˈkjuːʃn", partOfSpeech: "noun", definitions: ["cruel or unfair treatment because of beliefs or identity"], examples: ["Many fled their country to escape persecution."], vi: "sự ngược đãi, bức hại" },
      { headword: "prohibitive", ipa: "prəˈhɪbətɪv", partOfSpeech: "adjective", definitions: ["so high or strict that it prevents something"], examples: ["The prices were prohibitive for most buyers."], vi: "cấm đoán, quá cao (giá)" },
      { headword: "scrutiny", ipa: "ˈskruːtəni", partOfSpeech: "noun", definitions: ["close and careful examination"], examples: ["The company's accounts came under scrutiny."], vi: "sự giám sát chặt chẽ" },
    ],
    "The Research Camp": [
      { headword: "abstraction", ipa: "æbˈstrækʃn", partOfSpeech: "noun", definitions: ["an idea not connected to a specific example"], examples: ["The theory remains a pure abstraction without evidence."], vi: "sự trừu tượng" },
      { headword: "collaboration", ipa: "kəˌlæbəˈreɪʃn", partOfSpeech: "noun", definitions: ["the act of working together on something"], examples: ["The project was a collaboration between two universities."], vi: "sự hợp tác" },
      { headword: "criteria", ipa: "kraɪˈtɪəriə", partOfSpeech: "noun", definitions: ["standards used to judge or decide something"], examples: ["Applicants must meet strict criteria."], vi: "tiêu chí" },
      { headword: "demographic", ipa: "ˌdeməˈɡræfɪk", partOfSpeech: "adjective", definitions: ["relating to the structure of a population"], examples: ["The study analysed the city's demographic data."], vi: "nhân khẩu học" },
      { headword: "discourse", ipa: "ˈdɪskɔːrs", partOfSpeech: "noun", definitions: ["communication of ideas, especially spoken or written"], examples: ["Public discourse on climate change has grown."], vi: "diễn ngôn, sự thảo luận" },
      { headword: "inherent", ipa: "ɪnˈhɪərənt", partOfSpeech: "adjective", definitions: ["existing as a natural part of something"], examples: ["There are inherent risks in any investment."], vi: "vốn có" },
      { headword: "methodical", ipa: "məˈθɒdɪkl", partOfSpeech: "adjective", definitions: ["done in a careful, systematic way"], examples: ["She took a methodical approach to the research."], vi: "có phương pháp, bài bản" },
      { headword: "perceptive", ipa: "pərˈseptɪv", partOfSpeech: "adjective", definitions: ["quick to notice or understand things"], examples: ["His perceptive observations surprised the professor."], vi: "tinh ý, nhạy bén" },
      { headword: "rudimentary", ipa: "ˌruːdɪˈmentri", partOfSpeech: "adjective", definitions: ["basic or undeveloped"], examples: ["He has only a rudimentary knowledge of chemistry."], vi: "sơ đẳng, cơ bản" },
      { headword: "speculate", ipa: "ˈspekjuleɪt", partOfSpeech: "verb", definitions: ["to form a theory without firm evidence"], examples: ["Scientists speculate about the origins of the universe."], vi: "suy đoán" },
    ],
    "Shades of Meaning": [
      { headword: "elaborate", ipa: "ɪˈlæbərət", partOfSpeech: "adjective", definitions: ["detailed and complicated"], examples: ["They planned an elaborate wedding ceremony."], vi: "công phu, tỉ mỉ" },
      { headword: "elusive", ipa: "ɪˈluːsɪv", partOfSpeech: "adjective", definitions: ["difficult to find, catch, or achieve"], examples: ["A cure for the disease remains elusive."], vi: "khó nắm bắt" },
      { headword: "profound", ipa: "prəˈfaʊnd", partOfSpeech: "adjective", definitions: ["very great or intense; deeply felt"], examples: ["The book had a profound effect on her life."], vi: "sâu sắc" },
      { headword: "provocative", ipa: "prəˈvɒkətɪv", partOfSpeech: "adjective", definitions: ["causing strong reaction, especially anger or interest"], examples: ["The article made several provocative claims."], vi: "khiêu khích, gây tranh cãi" },
      { headword: "resonate", ipa: "ˈrezəneɪt", partOfSpeech: "verb", definitions: ["to have special meaning or emotional significance"], examples: ["Her story resonated with many readers."], vi: "gây tiếng vang, đồng cảm" },
      { headword: "subtly", ipa: "ˈsʌtli", partOfSpeech: "adverb", definitions: ["in a way that is not obvious; delicately"], examples: ["The design was subtly different from the original."], vi: "một cách tinh tế" },
      { headword: "superficial", ipa: "ˌsuːpərˈfɪʃl", partOfSpeech: "adjective", definitions: ["not thorough; only on the surface"], examples: ["He gave only a superficial explanation."], vi: "hời hợt, bề ngoài" },
      { headword: "unconventional", ipa: "ˌʌnkənˈvenʃənl", partOfSpeech: "adjective", definitions: ["not following usual customs or methods"], examples: ["She took an unconventional path to success."], vi: "khác thường, không theo quy ước" },
      { headword: "wry", ipa: "raɪ", partOfSpeech: "adjective", definitions: ["showing dry, slightly mocking humour"], examples: ["He gave a wry smile at the comment."], vi: "mỉa mai nhẹ nhàng" },
      { headword: "tactful", ipa: "ˈtæktfl", partOfSpeech: "adjective", definitions: ["careful not to offend or upset others"], examples: ["She gave tactful feedback on his work."], vi: "khéo léo, tế nhị" },
    ],
  },
  c2: {
    "The Summit Council": [
      { headword: "austere", ipa: "ɔːˈstɪər", partOfSpeech: "adjective", definitions: ["plain and simple; without luxury"], examples: ["He lived an austere life with few possessions."], vi: "khắc khổ, giản dị" },
      { headword: "diligent", ipa: "ˈdɪlɪdʒənt", partOfSpeech: "adjective", definitions: ["showing care and effort in work"], examples: ["She is a diligent researcher who double-checks everything."], vi: "chăm chỉ, cần mẫn" },
      { headword: "magnanimous", ipa: "mæɡˈnænɪməs", partOfSpeech: "adjective", definitions: ["generous and forgiving, especially to a rival"], examples: ["He was magnanimous in victory, praising his opponent."], vi: "rộng lượng, khoan dung" },
      { headword: "meticulous", ipa: "məˈtɪkjələs", partOfSpeech: "adjective", definitions: ["showing great attention to detail"], examples: ["She is meticulous in her research."], vi: "tỉ mỉ" },
      { headword: "nonchalant", ipa: "ˌnɒnʃəˈlɑːnt", partOfSpeech: "adjective", definitions: ["calm and relaxed, seeming not to care"], examples: ["He stayed nonchalant despite the pressure."], vi: "thản nhiên, hờ hững" },
      { headword: "stoicism", ipa: "ˈstoʊɪsɪzəm", partOfSpeech: "noun", definitions: ["the quality of enduring hardship without complaint"], examples: ["She faced her illness with remarkable stoicism."], vi: "sự chịu đựng, chủ nghĩa khắc kỷ" },
      { headword: "tenacious", ipa: "təˈneɪʃəs", partOfSpeech: "adjective", definitions: ["holding firmly to a purpose; persistent"], examples: ["Her tenacious attitude helped her succeed."], vi: "kiên trì, bền bỉ" },
      { headword: "taciturn", ipa: "ˈtæsɪtɜːrn", partOfSpeech: "adjective", definitions: ["tending to say very little"], examples: ["The taciturn old man rarely spoke to strangers."], vi: "ít nói, trầm lặng" },
      { headword: "unobtrusive", ipa: "ˌʌnəbˈtruːsɪv", partOfSpeech: "adjective", definitions: ["not drawing attention to oneself"], examples: ["The waiter was efficient and unobtrusive."], vi: "kín đáo, không phô trương" },
      { headword: "wistful", ipa: "ˈwɪstfl", partOfSpeech: "adjective", definitions: ["having a feeling of vague longing"], examples: ["She gave a wistful look at the old photographs."], vi: "hoài niệm, man mác buồn" },
    ],
    "Power and Principle": [
      { headword: "accountability", ipa: "əˌkaʊntəˈbɪləti", partOfSpeech: "noun", definitions: ["being responsible and able to explain one's actions"], examples: ["Voters demand greater accountability from leaders."], vi: "trách nhiệm giải trình" },
      { headword: "autonomous", ipa: "ɔːˈtɒnəməs", partOfSpeech: "adjective", definitions: ["able to govern or act independently"], examples: ["The region became an autonomous state."], vi: "tự trị" },
      { headword: "belligerent", ipa: "bəˈlɪdʒərənt", partOfSpeech: "adjective", definitions: ["hostile and aggressive"], examples: ["His belligerent tone surprised everyone at the meeting."], vi: "hiếu chiến" },
      { headword: "egalitarian", ipa: "ɪˌɡælɪˈteəriən", partOfSpeech: "adjective", definitions: ["believing in equal rights for all people"], examples: ["They built an egalitarian society with equal opportunity."], vi: "theo chủ nghĩa bình đẳng" },
      { headword: "mercenary", ipa: "ˈmɜːrsənəri", partOfSpeech: "adjective", definitions: ["motivated only by money or personal gain"], examples: ["His mercenary attitude put profit above ethics."], vi: "vụ lợi" },
      { headword: "philanthropic", ipa: "ˌfɪlənˈθrɒpɪk", partOfSpeech: "adjective", definitions: ["generous in helping the poor; charitable"], examples: ["The billionaire funded several philanthropic projects."], vi: "từ thiện" },
      { headword: "plutocrat", ipa: "ˈpluːtəkræt", partOfSpeech: "noun", definitions: ["a person whose power comes from wealth"], examples: ["Critics accused the plutocrats of controlling politics."], vi: "nhà tài phiệt" },
      { headword: "punitive", ipa: "ˈpjuːnətɪv", partOfSpeech: "adjective", definitions: ["intended as punishment"], examples: ["The court imposed punitive damages on the company."], vi: "mang tính trừng phạt" },
      { headword: "redundant", ipa: "rɪˈdʌndənt", partOfSpeech: "adjective", definitions: ["no longer needed; superfluous"], examples: ["Many clauses in the contract were redundant."], vi: "dư thừa" },
      { headword: "utilitarian", ipa: "juːˌtɪlɪˈteəriən", partOfSpeech: "adjective", definitions: ["designed to be useful rather than attractive"], examples: ["The building had a plain, utilitarian design."], vi: "thực dụng, vị lợi" },
    ],
    "The Scholar's Archive": [
      { headword: "correlate", ipa: "ˈkɒrəleɪt", partOfSpeech: "verb", definitions: ["to have a mutual relationship or connection"], examples: ["Income tends to correlate with education level."], vi: "có tương quan" },
      { headword: "hypothesis", ipa: "haɪˈpɒθəsɪs", partOfSpeech: "noun", definitions: ["a proposed explanation to be tested"], examples: ["The scientist tested her hypothesis in the lab."], vi: "giả thuyết" },
      { headword: "hypothetical", ipa: "ˌhaɪpəˈθetɪkl", partOfSpeech: "adjective", definitions: ["based on a suggested idea, not necessarily real"], examples: ["Let's consider a hypothetical scenario."], vi: "giả định" },
      { headword: "methodology", ipa: "ˌmeθəˈdɒlədʒi", partOfSpeech: "noun", definitions: ["a system of methods used in research"], examples: ["The paper explains its research methodology."], vi: "phương pháp luận" },
      { headword: "parameter", ipa: "pəˈræmɪtər", partOfSpeech: "noun", definitions: ["a limit or boundary that defines scope"], examples: ["The study set clear parameters for the experiment."], vi: "tham số, giới hạn" },
      { headword: "qualitative", ipa: "ˈkwɒlɪtətɪv", partOfSpeech: "adjective", definitions: ["relating to quality rather than quantity"], examples: ["The research used qualitative interviews."], vi: "định tính" },
      { headword: "retrospective", ipa: "ˌretrəˈspektɪv", partOfSpeech: "adjective", definitions: ["looking back on past events"], examples: ["The museum held a retrospective of her work."], vi: "hồi tưởng, nhìn lại" },
      { headword: "rhetorical", ipa: "rɪˈtɒrɪkl", partOfSpeech: "adjective", definitions: ["relating to persuasive speech or writing"], examples: ["He asked a rhetorical question to make his point."], vi: "mang tính tu từ" },
      { headword: "synthesis", ipa: "ˈsɪnθəsɪs", partOfSpeech: "noun", definitions: ["the combination of ideas to form a theory"], examples: ["Her essay is a synthesis of several theories."], vi: "sự tổng hợp" },
      { headword: "chronology", ipa: "krəˈnɒlədʒi", partOfSpeech: "noun", definitions: ["the arrangement of events in order of time"], examples: ["The book presents a chronology of the war."], vi: "niên đại học, trình tự thời gian" },
    ],
    "The Orator's Gift": [
      { headword: "allegory", ipa: "ˈælɪɡɔːri", partOfSpeech: "noun", definitions: ["a story with a hidden moral or political meaning"], examples: ["The novel is an allegory for political corruption."], vi: "truyện ngụ ngôn" },
      { headword: "antithesis", ipa: "ænˈtɪθəsɪs", partOfSpeech: "noun", definitions: ["the exact opposite of something"], examples: ["Her calm manner was the antithesis of his anger."], vi: "sự đối lập" },
      { headword: "colloquial", ipa: "kəˈloʊkwiəl", partOfSpeech: "adjective", definitions: ["used in informal, everyday speech"], examples: ["The novel is full of colloquial expressions."], vi: "thông tục, khẩu ngữ" },
      { headword: "connotation", ipa: "ˌkɒnəˈteɪʃn", partOfSpeech: "noun", definitions: ["an idea or feeling a word suggests beyond its meaning"], examples: ["The word 'cheap' has a negative connotation."], vi: "hàm ý, nghĩa bóng" },
      { headword: "euphemism", ipa: "ˈjuːfəmɪzəm", partOfSpeech: "noun", definitions: ["a mild word used instead of a harsh one"], examples: ["'Passed away' is a euphemism for 'died'."], vi: "uyển ngữ, cách nói giảm" },
      { headword: "figurative", ipa: "ˈfɪɡərətɪv", partOfSpeech: "adjective", definitions: ["using words in a non-literal, symbolic way"], examples: ["He used figurative language to describe her heart of gold."], vi: "mang tính ẩn dụ, bóng bẩy" },
      { headword: "idiomatic", ipa: "ˌɪdiəˈmætɪk", partOfSpeech: "adjective", definitions: ["using expressions natural to a native speaker"], examples: ["She speaks very idiomatic English."], vi: "tự nhiên như người bản ngữ" },
      { headword: "lyrical", ipa: "ˈlɪrɪkl", partOfSpeech: "adjective", definitions: ["expressing emotion in a beautiful, song-like way"], examples: ["The poet wrote in a lyrical style."], vi: "trữ tình" },
      { headword: "paradoxical", ipa: "ˌpærəˈdɒksɪkl", partOfSpeech: "adjective", definitions: ["seemingly contradictory but possibly true"], examples: ["It's paradoxical that saving money can sometimes cost more."], vi: "nghịch lý" },
      { headword: "rhetoric", ipa: "ˈretərɪk", partOfSpeech: "noun", definitions: ["language designed to persuade, sometimes insincere"], examples: ["His speech was full of empty rhetoric."], vi: "hùng biện, lời lẽ hoa mỹ" },
    ],
  },
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

  for (const level of VOCAB_LEVELS_SEED) {
    await prisma.vocabLevel.upsert({
      where: { id: level.id },
      update: level,
      create: level,
    });
  }
  console.log(`Seeded ${VOCAB_LEVELS_SEED.length} vocabulary levels.`);

  let vocabCount = 0;
  let chapterCount = 0;
  for (const [levelId, chapters] of Object.entries(CEFR_VOCAB_BANK)) {
    const cefrLevel = VOCAB_LEVELS_SEED.find((l) => l.id === levelId)?.cefrLevel;
    let chapterOrder = 0;
    for (const [chapter, words] of Object.entries(chapters)) {
      chapterCount += 1;
      let wordOrder = 0;
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
          chapter,
          chapterOrder,
          wordOrder,
          vocabLevelId: levelId,
        };
        if (existing) {
          await prisma.vocabItem.update({ where: { id: existing.id }, data });
        } else {
          await prisma.vocabItem.create({ data });
        }
        vocabCount += 1;
        wordOrder += 1;
      }
      chapterOrder += 1;
    }
  }
  console.log(
    `Seeded ${vocabCount} CEFR-leveled vocabulary items across ${chapterCount} chapters in ${Object.keys(CEFR_VOCAB_BANK).length} levels.`,
  );

  // Prune older placeholder words that predate this vocabulary bank (e.g. the original A1-C1
  // stage-based lists) so a redeploy doesn't leave stray, unlinked words behind.
  const currentHeadwords = Object.values(CEFR_VOCAB_BANK).flatMap((chapters) =>
    Object.values(chapters).flatMap((words) => words.map((w) => w.headword)),
  );
  const { count: prunedCount } = await prisma.vocabItem.deleteMany({
    where: { headword: { notIn: currentHeadwords } },
  });
  if (prunedCount > 0) console.log(`Pruned ${prunedCount} superseded vocabulary item(s).`);

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
