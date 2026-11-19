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
 * The CEFR-leveled vocabulary bank that powers the Vocabulary tab: stageId -> topic -> words.
 * Each IELTS stage targets one CEFR level (see CEFR_LEVEL_BY_STAGE), and each level is split
 * into topic decks so learners study in focused flashcard sessions rather than one long list.
 */
const CEFR_VOCAB_BANK: Record<string, Record<string, readonly SeedVocabEntry[]>> = {
  foundation: {
    "Family & People": [
      { headword: "family", ipa: "ˈfæməli", partOfSpeech: "noun", definitions: ["a group of people related by blood or marriage"], examples: ["My family lives in a small town."], vi: "gia đình" },
      { headword: "friend", ipa: "frend", partOfSpeech: "noun", definitions: ["a person you know well and like"], examples: ["She is my best friend."], vi: "bạn" },
      { headword: "mother", ipa: "ˈmʌðər", partOfSpeech: "noun", definitions: ["a female parent"], examples: ["My mother cooks dinner every night."], vi: "mẹ" },
      { headword: "father", ipa: "ˈfɑːðər", partOfSpeech: "noun", definitions: ["a male parent"], examples: ["My father works in a bank."], vi: "bố" },
      { headword: "child", ipa: "tʃaɪld", partOfSpeech: "noun", definitions: ["a young human being"], examples: ["The child is playing in the park."], vi: "đứa trẻ" },
      { headword: "people", ipa: "ˈpiːpl", partOfSpeech: "noun", definitions: ["human beings in general"], examples: ["Many people live in this city."], vi: "con người, mọi người" },
      { headword: "man", ipa: "mæn", partOfSpeech: "noun", definitions: ["an adult male person"], examples: ["The man is reading a newspaper."], vi: "người đàn ông" },
      { headword: "woman", ipa: "ˈwʊmən", partOfSpeech: "noun", definitions: ["an adult female person"], examples: ["The woman is a teacher."], vi: "người phụ nữ" },
      { headword: "baby", ipa: "ˈbeɪbi", partOfSpeech: "noun", definitions: ["a very young child"], examples: ["The baby is sleeping now."], vi: "em bé" },
      { headword: "name", ipa: "neɪm", partOfSpeech: "noun", definitions: ["a word used to identify a person"], examples: ["What is your name?"], vi: "tên" },
    ],
    "Food & Drink": [
      { headword: "water", ipa: "ˈwɔːtər", partOfSpeech: "noun", definitions: ["a clear liquid that people drink"], examples: ["Please drink more water every day."], vi: "nước" },
      { headword: "food", ipa: "fuːd", partOfSpeech: "noun", definitions: ["things that people eat"], examples: ["This food tastes delicious."], vi: "thức ăn" },
      { headword: "eat", ipa: "iːt", partOfSpeech: "verb", definitions: ["to put food in your mouth and swallow it"], examples: ["We eat dinner at seven o'clock."], vi: "ăn" },
      { headword: "drink", ipa: "drɪŋk", partOfSpeech: "verb", definitions: ["to take liquid into your mouth and swallow it"], examples: ["I drink coffee every morning."], vi: "uống" },
      { headword: "breakfast", ipa: "ˈbrekfəst", partOfSpeech: "noun", definitions: ["the first meal of the day"], examples: ["I always eat breakfast before school."], vi: "bữa sáng" },
      { headword: "lunch", ipa: "lʌntʃ", partOfSpeech: "noun", definitions: ["a meal eaten in the middle of the day"], examples: ["We have lunch at noon."], vi: "bữa trưa" },
      { headword: "dinner", ipa: "ˈdɪnər", partOfSpeech: "noun", definitions: ["the main meal eaten in the evening"], examples: ["My family eats dinner together."], vi: "bữa tối" },
      { headword: "apple", ipa: "ˈæpl", partOfSpeech: "noun", definitions: ["a round fruit with red or green skin"], examples: ["She ate a fresh apple."], vi: "quả táo" },
      { headword: "bread", ipa: "bred", partOfSpeech: "noun", definitions: ["a food made from flour and water, baked"], examples: ["He bought fresh bread from the shop."], vi: "bánh mì" },
      { headword: "milk", ipa: "mɪlk", partOfSpeech: "noun", definitions: ["a white liquid from cows that people drink"], examples: ["The children drink milk every morning."], vi: "sữa" },
    ],
    "Daily Life & Time": [
      { headword: "day", ipa: "deɪ", partOfSpeech: "noun", definitions: ["a period of twenty-four hours"], examples: ["Today is a beautiful day."], vi: "ngày" },
      { headword: "time", ipa: "taɪm", partOfSpeech: "noun", definitions: ["what is measured in hours, minutes, and seconds"], examples: ["What time is it now?"], vi: "thời gian" },
      { headword: "morning", ipa: "ˈmɔːrnɪŋ", partOfSpeech: "noun", definitions: ["the early part of the day"], examples: ["I go jogging every morning."], vi: "buổi sáng" },
      { headword: "night", ipa: "naɪt", partOfSpeech: "noun", definitions: ["the dark hours between evening and morning"], examples: ["We watched a movie last night."], vi: "buổi tối, đêm" },
      { headword: "today", ipa: "təˈdeɪ", partOfSpeech: "adverb", definitions: ["on this day"], examples: ["I feel very happy today."], vi: "hôm nay" },
      { headword: "tomorrow", ipa: "təˈmɒroʊ", partOfSpeech: "adverb", definitions: ["the day after today"], examples: ["We will meet tomorrow morning."], vi: "ngày mai" },
      { headword: "week", ipa: "wiːk", partOfSpeech: "noun", definitions: ["a period of seven days"], examples: ["I visit my parents every week."], vi: "tuần" },
      { headword: "work", ipa: "wɜːrk", partOfSpeech: "verb", definitions: ["to do a job"], examples: ["My father works in a bank."], vi: "làm việc" },
      { headword: "school", ipa: "skuːl", partOfSpeech: "noun", definitions: ["a place where children go to learn"], examples: ["He walks to school every morning."], vi: "trường học" },
      { headword: "sleep", ipa: "sliːp", partOfSpeech: "verb", definitions: ["to rest with your eyes closed at night"], examples: ["Children need to sleep eight hours a night."], vi: "ngủ" },
    ],
    "Home & Objects": [
      { headword: "house", ipa: "haʊs", partOfSpeech: "noun", definitions: ["a building where people live"], examples: ["They bought a new house last year."], vi: "ngôi nhà" },
      { headword: "room", ipa: "ruːm", partOfSpeech: "noun", definitions: ["a part of a building with its own walls"], examples: ["My bedroom is a small room."], vi: "căn phòng" },
      { headword: "door", ipa: "dɔːr", partOfSpeech: "noun", definitions: ["a flat object used to open or close an entrance"], examples: ["Please close the door quietly."], vi: "cánh cửa" },
      { headword: "table", ipa: "ˈteɪbl", partOfSpeech: "noun", definitions: ["a piece of furniture with a flat top"], examples: ["The food is on the table."], vi: "cái bàn" },
      { headword: "chair", ipa: "tʃeər", partOfSpeech: "noun", definitions: ["a piece of furniture for one person to sit on"], examples: ["Please sit on this chair."], vi: "cái ghế" },
      { headword: "book", ipa: "bʊk", partOfSpeech: "noun", definitions: ["a set of printed pages fixed together"], examples: ["She is reading an interesting book."], vi: "quyển sách" },
      { headword: "money", ipa: "ˈmʌni", partOfSpeech: "noun", definitions: ["coins and notes used to buy things"], examples: ["He doesn't have much money."], vi: "tiền" },
      { headword: "car", ipa: "kɑːr", partOfSpeech: "noun", definitions: ["a road vehicle with four wheels"], examples: ["We drove to the beach in our car."], vi: "xe hơi" },
      { headword: "phone", ipa: "foʊn", partOfSpeech: "noun", definitions: ["a device used to talk to people far away"], examples: ["My phone is ringing."], vi: "điện thoại" },
      { headword: "big", ipa: "bɪɡ", partOfSpeech: "adjective", definitions: ["large in size"], examples: ["They live in a big house."], vi: "to, lớn" },
    ],
  },
  "band-4-5": {
    "Shopping & Money": [
      { headword: "price", ipa: "praɪs", partOfSpeech: "noun", definitions: ["the amount of money something costs"], examples: ["The price of this shirt is too high."], vi: "giá cả" },
      { headword: "cheap", ipa: "tʃiːp", partOfSpeech: "adjective", definitions: ["costing very little money"], examples: ["These vegetables are cheap at the market."], vi: "rẻ" },
      { headword: "expensive", ipa: "ɪkˈspensɪv", partOfSpeech: "adjective", definitions: ["costing a lot of money"], examples: ["That restaurant is too expensive for us."], vi: "đắt" },
      { headword: "pay", ipa: "peɪ", partOfSpeech: "verb", definitions: ["to give money for something"], examples: ["Can I pay by credit card?"], vi: "trả tiền" },
      { headword: "buy", ipa: "baɪ", partOfSpeech: "verb", definitions: ["to get something by paying money for it"], examples: ["I need to buy some new shoes."], vi: "mua" },
      { headword: "sell", ipa: "sel", partOfSpeech: "verb", definitions: ["to give something to someone in exchange for money"], examples: ["The shop sells fresh fruit every day."], vi: "bán" },
      { headword: "shop", ipa: "ʃɒp", partOfSpeech: "noun", definitions: ["a place where you can buy things"], examples: ["There is a new shop near my house."], vi: "cửa hàng" },
      { headword: "customer", ipa: "ˈkʌstəmər", partOfSpeech: "noun", definitions: ["a person who buys goods or services"], examples: ["The customer asked for a refund."], vi: "khách hàng" },
      { headword: "discount", ipa: "ˈdɪskaʊnt", partOfSpeech: "noun", definitions: ["a reduction in the usual price"], examples: ["We got a 20 percent discount on the shoes."], vi: "giảm giá" },
      { headword: "convenient", ipa: "kənˈviːniənt", partOfSpeech: "adjective", definitions: ["fitting in well with a person's needs"], examples: ["Is it convenient to meet tomorrow?"], vi: "thuận tiện" },
    ],
    "Travel & Transport": [
      { headword: "travel", ipa: "ˈtrævl", partOfSpeech: "verb", definitions: ["to go from one place to another"], examples: ["They love to travel to new countries."], vi: "du lịch, đi lại" },
      { headword: "journey", ipa: "ˈdʒɜːrni", partOfSpeech: "noun", definitions: ["an act of travelling from one place to another"], examples: ["The journey to the city took three hours."], vi: "hành trình" },
      { headword: "airport", ipa: "ˈeərpɔːrt", partOfSpeech: "noun", definitions: ["a place where aircraft take off and land"], examples: ["We arrived at the airport early."], vi: "sân bay" },
      { headword: "ticket", ipa: "ˈtɪkɪt", partOfSpeech: "noun", definitions: ["a piece of paper that shows you paid to travel"], examples: ["I bought a train ticket online."], vi: "vé" },
      { headword: "luggage", ipa: "ˈlʌɡɪdʒ", partOfSpeech: "noun", definitions: ["the bags and suitcases you take when travelling"], examples: ["Please check your luggage before boarding."], vi: "hành lý" },
      { headword: "arrive", ipa: "əˈraɪv", partOfSpeech: "verb", definitions: ["to reach a place, especially at the end of a journey"], examples: ["We will arrive at six o'clock."], vi: "đến nơi" },
      { headword: "depart", ipa: "dɪˈpɑːrt", partOfSpeech: "verb", definitions: ["to leave a place, especially to start a journey"], examples: ["The train departs from platform three."], vi: "khởi hành" },
      { headword: "passenger", ipa: "ˈpæsɪndʒər", partOfSpeech: "noun", definitions: ["a person travelling in a vehicle but not driving it"], examples: ["The bus can carry forty passengers."], vi: "hành khách" },
      { headword: "direction", ipa: "dəˈrekʃn", partOfSpeech: "noun", definitions: ["the way you must go to reach a place"], examples: ["Can you give me directions to the station?"], vi: "hướng, phương hướng" },
      { headword: "destination", ipa: "ˌdestɪˈneɪʃn", partOfSpeech: "noun", definitions: ["the place someone is travelling to"], examples: ["Paris is a popular holiday destination."], vi: "điểm đến" },
    ],
    "Health & Body": [
      { headword: "health", ipa: "helθ", partOfSpeech: "noun", definitions: ["the condition of your body and mind"], examples: ["Exercise is good for your health."], vi: "sức khỏe" },
      { headword: "healthy", ipa: "ˈhelθi", partOfSpeech: "adjective", definitions: ["having or showing good health"], examples: ["She eats a healthy diet every day."], vi: "khỏe mạnh" },
      { headword: "sick", ipa: "sɪk", partOfSpeech: "adjective", definitions: ["feeling ill or unwell"], examples: ["He stayed home because he felt sick."], vi: "ốm, bệnh" },
      { headword: "hospital", ipa: "ˈhɒspɪtl", partOfSpeech: "noun", definitions: ["a place where sick people are treated"], examples: ["She works as a nurse at the hospital."], vi: "bệnh viện" },
      { headword: "doctor", ipa: "ˈdɒktər", partOfSpeech: "noun", definitions: ["a person trained to treat sick people"], examples: ["The doctor gave me some medicine."], vi: "bác sĩ" },
      { headword: "medicine", ipa: "ˈmedsn", partOfSpeech: "noun", definitions: ["a substance used to treat illness"], examples: ["Take this medicine twice a day."], vi: "thuốc" },
      { headword: "pain", ipa: "peɪn", partOfSpeech: "noun", definitions: ["a feeling of physical suffering"], examples: ["She felt a sharp pain in her leg."], vi: "cơn đau" },
      { headword: "exercise", ipa: "ˈeksərsaɪz", partOfSpeech: "noun", definitions: ["physical activity to stay fit"], examples: ["Regular exercise keeps your heart healthy."], vi: "tập thể dục" },
      { headword: "rest", ipa: "rest", partOfSpeech: "verb", definitions: ["to stop working and relax"], examples: ["You should rest after a long trip."], vi: "nghỉ ngơi" },
      { headword: "body", ipa: "ˈbɒdi", partOfSpeech: "noun", definitions: ["the whole physical structure of a person"], examples: ["Drinking water is important for your body."], vi: "cơ thể" },
    ],
    "Work & Study": [
      { headword: "job", ipa: "dʒɒb", partOfSpeech: "noun", definitions: ["a paid position of regular work"], examples: ["She found a new job last month."], vi: "công việc" },
      { headword: "company", ipa: "ˈkʌmpəni", partOfSpeech: "noun", definitions: ["a business that sells goods or services"], examples: ["He works for a large company."], vi: "công ty" },
      { headword: "meeting", ipa: "ˈmiːtɪŋ", partOfSpeech: "noun", definitions: ["an event where people come together to discuss something"], examples: ["We have a meeting at nine tomorrow."], vi: "cuộc họp" },
      { headword: "manager", ipa: "ˈmænɪdʒər", partOfSpeech: "noun", definitions: ["a person who controls an organisation or department"], examples: ["The manager approved my request."], vi: "người quản lý" },
      { headword: "colleague", ipa: "ˈkɒliːɡ", partOfSpeech: "noun", definitions: ["a person you work with"], examples: ["My colleague helped me finish the report."], vi: "đồng nghiệp" },
      { headword: "study", ipa: "ˈstʌdi", partOfSpeech: "verb", definitions: ["to spend time learning about a subject"], examples: ["She studies English every evening."], vi: "học" },
      { headword: "exam", ipa: "ɪɡˈzæm", partOfSpeech: "noun", definitions: ["a formal test of knowledge or skill"], examples: ["He passed his English exam easily."], vi: "kỳ thi" },
      { headword: "homework", ipa: "ˈhoʊmwɜːrk", partOfSpeech: "noun", definitions: ["school work that students do at home"], examples: ["I need to finish my homework tonight."], vi: "bài tập về nhà" },
      { headword: "improve", ipa: "ɪmˈpruːv", partOfSpeech: "verb", definitions: ["to make or become better"], examples: ["He wants to improve his English."], vi: "cải thiện" },
      { headword: "explain", ipa: "ɪkˈspleɪn", partOfSpeech: "verb", definitions: ["to make something clear to someone"], examples: ["Can you explain this word to me?"], vi: "giải thích" },
    ],
  },
  "band-5-6": {
    "Environment & Nature": [
      { headword: "environment", ipa: "ɪnˈvaɪrənmənt", partOfSpeech: "noun", definitions: ["the natural world around us"], examples: ["We should protect the environment."], vi: "môi trường" },
      { headword: "pollution", ipa: "pəˈluːʃn", partOfSpeech: "noun", definitions: ["harmful substances that damage air, water or land"], examples: ["Air pollution is a serious problem in big cities."], vi: "ô nhiễm" },
      { headword: "climate", ipa: "ˈklaɪmət", partOfSpeech: "noun", definitions: ["the usual weather conditions of a place"], examples: ["The climate here is warm all year."], vi: "khí hậu" },
      { headword: "recycle", ipa: "ˌriːˈsaɪkl", partOfSpeech: "verb", definitions: ["to process waste so it can be used again"], examples: ["We recycle paper and plastic at home."], vi: "tái chế" },
      { headword: "resource", ipa: "ˈriːsɔːrs", partOfSpeech: "noun", definitions: ["a useful supply of something, like energy or water"], examples: ["Fresh water is a limited resource."], vi: "tài nguyên" },
      { headword: "wildlife", ipa: "ˈwaɪldlaɪf", partOfSpeech: "noun", definitions: ["animals and plants living in their natural environment"], examples: ["The national park protects local wildlife."], vi: "động thực vật hoang dã" },
      { headword: "sustainable", ipa: "səˈsteɪnəbl", partOfSpeech: "adjective", definitions: ["able to continue over a long period without causing harm"], examples: ["We need sustainable solutions for energy."], vi: "bền vững" },
      { headword: "energy", ipa: "ˈenərdʒi", partOfSpeech: "noun", definitions: ["power used for heating, electricity, or movement"], examples: ["Solar panels produce clean energy."], vi: "năng lượng" },
      { headword: "protect", ipa: "prəˈtekt", partOfSpeech: "verb", definitions: ["to keep someone or something safe from harm"], examples: ["Laws protect endangered animals."], vi: "bảo vệ" },
      { headword: "drought", ipa: "draʊt", partOfSpeech: "noun", definitions: ["a long period of unusually low rainfall"], examples: ["The drought damaged many farmers' crops."], vi: "hạn hán" },
    ],
    "Technology & Media": [
      { headword: "technology", ipa: "tekˈnɒlədʒi", partOfSpeech: "noun", definitions: ["the use of scientific knowledge for practical purposes"], examples: ["New technology has changed how we communicate."], vi: "công nghệ" },
      { headword: "internet", ipa: "ˈɪntərnet", partOfSpeech: "noun", definitions: ["the global computer network"], examples: ["She looked up the answer on the internet."], vi: "internet" },
      { headword: "device", ipa: "dɪˈvaɪs", partOfSpeech: "noun", definitions: ["a machine or tool made for a particular purpose"], examples: ["This device can measure your heart rate."], vi: "thiết bị" },
      { headword: "software", ipa: "ˈsɒftweər", partOfSpeech: "noun", definitions: ["the programs used to operate a computer"], examples: ["The company develops software for banks."], vi: "phần mềm" },
      { headword: "online", ipa: "ˈɒnlaɪn", partOfSpeech: "adjective", definitions: ["connected to or available through the internet"], examples: ["Many students now take online classes."], vi: "trực tuyến" },
      { headword: "data", ipa: "ˈdeɪtə", partOfSpeech: "noun", definitions: ["facts and information, especially for analysis"], examples: ["The app collects data about your sleep."], vi: "dữ liệu" },
      { headword: "upload", ipa: "ʌpˈloʊd", partOfSpeech: "verb", definitions: ["to send data from your device to the internet"], examples: ["She uploaded the photos to her account."], vi: "tải lên" },
      { headword: "social media", ipa: "ˈsoʊʃl ˈmiːdiə", partOfSpeech: "noun", definitions: ["websites and apps for sharing content and connecting"], examples: ["Many businesses advertise on social media."], vi: "mạng xã hội" },
      { headword: "innovation", ipa: "ˌɪnəˈveɪʃn", partOfSpeech: "noun", definitions: ["a new idea, method, or product"], examples: ["The company is known for its innovation."], vi: "sự đổi mới" },
      { headword: "artificial", ipa: "ˌɑːrtɪˈfɪʃl", partOfSpeech: "adjective", definitions: ["made by humans, not occurring naturally"], examples: ["Artificial intelligence is used in many apps today."], vi: "nhân tạo" },
    ],
    "Society & Community": [
      { headword: "community", ipa: "kəˈmjuːnəti", partOfSpeech: "noun", definitions: ["a group of people living in the same area"], examples: ["The community helped after the storm."], vi: "cộng đồng" },
      { headword: "society", ipa: "səˈsaɪəti", partOfSpeech: "noun", definitions: ["people living together in an organised way"], examples: ["Education plays a key role in modern society."], vi: "xã hội" },
      { headword: "government", ipa: "ˈɡʌvərnmənt", partOfSpeech: "noun", definitions: ["the group of people who govern a country"], examples: ["The government announced a new policy."], vi: "chính phủ" },
      { headword: "citizen", ipa: "ˈsɪtɪzn", partOfSpeech: "noun", definitions: ["a legally recognised member of a country"], examples: ["Every citizen has the right to vote."], vi: "công dân" },
      { headword: "volunteer", ipa: "ˌvɒlənˈtɪər", partOfSpeech: "noun", definitions: ["a person who offers to do something without being paid"], examples: ["She works as a volunteer at the shelter."], vi: "tình nguyện viên" },
      { headword: "culture", ipa: "ˈkʌltʃər", partOfSpeech: "noun", definitions: ["the customs and beliefs of a group of people"], examples: ["Vietnamese culture values family highly."], vi: "văn hóa" },
      { headword: "tradition", ipa: "trəˈdɪʃn", partOfSpeech: "noun", definitions: ["a custom passed down through generations"], examples: ["This festival is an important tradition here."], vi: "truyền thống" },
      { headword: "diversity", ipa: "daɪˈvɜːrsəti", partOfSpeech: "noun", definitions: ["the state of including many different types of people"], examples: ["The city is known for its cultural diversity."], vi: "sự đa dạng" },
      { headword: "population", ipa: "ˌpɒpjuˈleɪʃn", partOfSpeech: "noun", definitions: ["all the people living in a place"], examples: ["The population of the city is growing fast."], vi: "dân số" },
      { headword: "charity", ipa: "ˈtʃærəti", partOfSpeech: "noun", definitions: ["an organisation that helps people in need"], examples: ["He donates money to charity every month."], vi: "tổ chức từ thiện" },
    ],
    "Personality & Relationships": [
      { headword: "personality", ipa: "ˌpɜːrsəˈnæləti", partOfSpeech: "noun", definitions: ["the set of qualities that make a person who they are"], examples: ["She has a warm, friendly personality."], vi: "tính cách" },
      { headword: "confident", ipa: "ˈkɒnfɪdənt", partOfSpeech: "adjective", definitions: ["feeling sure about your own abilities"], examples: ["He felt confident before the interview."], vi: "tự tin" },
      { headword: "honest", ipa: "ˈɒnɪst", partOfSpeech: "adjective", definitions: ["telling the truth and not cheating"], examples: ["Please be honest about what happened."], vi: "trung thực" },
      { headword: "patient", ipa: "ˈpeɪʃnt", partOfSpeech: "adjective", definitions: ["able to wait calmly without complaining"], examples: ["A good teacher must be patient."], vi: "kiên nhẫn" },
      { headword: "generous", ipa: "ˈdʒenərəs", partOfSpeech: "adjective", definitions: ["willing to give more than is expected"], examples: ["She is generous with her time and money."], vi: "hào phóng" },
      { headword: "relationship", ipa: "rɪˈleɪʃnʃɪp", partOfSpeech: "noun", definitions: ["the way two people are connected or behave towards each other"], examples: ["They have a close relationship with their neighbours."], vi: "mối quan hệ" },
      { headword: "trust", ipa: "trʌst", partOfSpeech: "verb", definitions: ["to believe someone is reliable and honest"], examples: ["I trust my best friend completely."], vi: "tin tưởng" },
      { headword: "argument", ipa: "ˈɑːrɡjumənt", partOfSpeech: "noun", definitions: ["a disagreement, often with angry words"], examples: ["They had an argument about money."], vi: "cuộc tranh cãi" },
      { headword: "support", ipa: "səˈpɔːrt", partOfSpeech: "verb", definitions: ["to help or encourage someone"], examples: ["My family always supports my decisions."], vi: "ủng hộ, hỗ trợ" },
      { headword: "tendency", ipa: "ˈtendənsi", partOfSpeech: "noun", definitions: ["a way of behaving that happens often"], examples: ["She has a tendency to arrive late."], vi: "xu hướng" },
    ],
  },
  "band-6-7": {
    "Business & Economy": [
      { headword: "economy", ipa: "ɪˈkɒnəmi", partOfSpeech: "noun", definitions: ["the system of trade and industry of a country"], examples: ["The country's economy grew rapidly last year."], vi: "nền kinh tế" },
      { headword: "investment", ipa: "ɪnˈvestmənt", partOfSpeech: "noun", definitions: ["money put into something to earn a profit"], examples: ["Buying this property was a wise investment."], vi: "khoản đầu tư" },
      { headword: "profit", ipa: "ˈprɒfɪt", partOfSpeech: "noun", definitions: ["money gained after costs are paid"], examples: ["The company made a large profit this quarter."], vi: "lợi nhuận" },
      { headword: "revenue", ipa: "ˈrevənjuː", partOfSpeech: "noun", definitions: ["income that a business receives"], examples: ["Online sales boosted the company's revenue."], vi: "doanh thu" },
      { headword: "competitive", ipa: "kəmˈpetətɪv", partOfSpeech: "adjective", definitions: ["as good as or better than others in the same field"], examples: ["The job market is very competitive now."], vi: "cạnh tranh" },
      { headword: "entrepreneur", ipa: "ˌɒntrəprəˈnɜːr", partOfSpeech: "noun", definitions: ["a person who starts and runs a business"], examples: ["She became a successful entrepreneur at twenty-five."], vi: "doanh nhân" },
      { headword: "budget", ipa: "ˈbʌdʒɪt", partOfSpeech: "noun", definitions: ["a plan for how money will be spent"], examples: ["The city set a new budget for schools."], vi: "ngân sách" },
      { headword: "inflation", ipa: "ɪnˈfleɪʃn", partOfSpeech: "noun", definitions: ["a general rise in prices over time"], examples: ["High inflation makes everyday goods more expensive."], vi: "lạm phát" },
      { headword: "consumer", ipa: "kənˈsjuːmər", partOfSpeech: "noun", definitions: ["a person who buys goods or services"], examples: ["Consumers are demanding more eco-friendly products."], vi: "người tiêu dùng" },
      { headword: "negotiate", ipa: "nɪˈɡoʊʃieɪt", partOfSpeech: "verb", definitions: ["to discuss something to reach an agreement"], examples: ["They negotiated a better price for the house."], vi: "đàm phán" },
    ],
    "Science & Research": [
      { headword: "hypothesis", ipa: "haɪˈpɒθəsɪs", partOfSpeech: "noun", definitions: ["an idea suggested as an explanation but not yet proved"], examples: ["The scientist tested her hypothesis."], vi: "giả thuyết" },
      { headword: "evidence", ipa: "ˈevɪdəns", partOfSpeech: "noun", definitions: ["facts that show something is true"], examples: ["There is strong evidence supporting the theory."], vi: "bằng chứng" },
      { headword: "experiment", ipa: "ɪkˈsperɪmənt", partOfSpeech: "noun", definitions: ["a scientific test to discover something"], examples: ["They conducted an experiment to test the medicine."], vi: "thí nghiệm" },
      { headword: "analyze", ipa: "ˈænəlaɪz", partOfSpeech: "verb", definitions: ["to examine something carefully in detail"], examples: ["Scientists analyzed the data closely."], vi: "phân tích" },
      { headword: "discovery", ipa: "dɪˈskʌvəri", partOfSpeech: "noun", definitions: ["the act of finding something new"], examples: ["The discovery changed how we understand the disease."], vi: "sự khám phá" },
      { headword: "theory", ipa: "ˈθɪəri", partOfSpeech: "noun", definitions: ["a set of ideas explaining why something happens"], examples: ["Scientists proposed a new theory about the universe."], vi: "lý thuyết" },
      { headword: "phenomenon", ipa: "fəˈnɒmɪnən", partOfSpeech: "noun", definitions: ["a fact or event, especially one that is unusual"], examples: ["Climate change is a global phenomenon."], vi: "hiện tượng" },
      { headword: "empirical", ipa: "ɪmˈpɪrɪkl", partOfSpeech: "adjective", definitions: ["based on observation or experiment rather than theory"], examples: ["The theory lacks empirical evidence."], vi: "thực nghiệm" },
      { headword: "accurate", ipa: "ˈækjərət", partOfSpeech: "adjective", definitions: ["correct and exact, especially as a result of care"], examples: ["Please give me an accurate description."], vi: "chính xác" },
      { headword: "significant", ipa: "sɪɡˈnɪfɪkənt", partOfSpeech: "adjective", definitions: ["large or important enough to be noticed"], examples: ["There has been a significant increase in sales."], vi: "đáng kể" },
    ],
    "Culture & Globalisation": [
      { headword: "globalisation", ipa: "ˌɡloʊbəlaɪˈzeɪʃn", partOfSpeech: "noun", definitions: ["the process by which the world becomes more interconnected"], examples: ["Globalisation has changed how companies do business."], vi: "toàn cầu hóa" },
      { headword: "controversial", ipa: "ˌkɒntrəˈvɜːrʃl", partOfSpeech: "adjective", definitions: ["causing strong disagreement"], examples: ["It was a controversial decision."], vi: "gây tranh cãi" },
      { headword: "ambiguous", ipa: "æmˈbɪɡjuəs", partOfSpeech: "adjective", definitions: ["having more than one possible meaning"], examples: ["His answer was rather ambiguous."], vi: "mơ hồ" },
      { headword: "perspective", ipa: "pərˈspektɪv", partOfSpeech: "noun", definitions: ["a particular way of viewing things"], examples: ["Try to see it from her perspective."], vi: "góc nhìn" },
      { headword: "identity", ipa: "aɪˈdentəti", partOfSpeech: "noun", definitions: ["the characteristics that define who someone is"], examples: ["Language is closely tied to cultural identity."], vi: "bản sắc" },
      { headword: "heritage", ipa: "ˈherɪtɪdʒ", partOfSpeech: "noun", definitions: ["traditions and buildings passed down from the past"], examples: ["The old town is part of our cultural heritage."], vi: "di sản" },
      { headword: "integration", ipa: "ˌɪntɪˈɡreɪʃn", partOfSpeech: "noun", definitions: ["the process of combining different groups into one"], examples: ["The school supports the integration of new students."], vi: "sự hòa nhập" },
      { headword: "stereotype", ipa: "ˈsteriətaɪp", partOfSpeech: "noun", definitions: ["a fixed and often unfair idea about a group of people"], examples: ["The film challenges common stereotypes."], vi: "định kiến" },
      { headword: "assimilate", ipa: "əˈsɪməleɪt", partOfSpeech: "verb", definitions: ["to become part of a different group or culture"], examples: ["Immigrants often assimilate into the local culture over time."], vi: "hòa nhập, đồng hóa" },
      { headword: "coherent", ipa: "koʊˈhɪərənt", partOfSpeech: "adjective", definitions: ["logical and well organized; easy to follow"], examples: ["She gave a coherent explanation of the plan."], vi: "mạch lạc" },
    ],
    "Opinions & Argument": [
      { headword: "argue", ipa: "ˈɑːrɡjuː", partOfSpeech: "verb", definitions: ["to give reasons for or against something"], examples: ["She argued that the plan was too risky."], vi: "tranh luận" },
      { headword: "assert", ipa: "əˈsɜːrt", partOfSpeech: "verb", definitions: ["to state something confidently as true"], examples: ["He asserted that the results were reliable."], vi: "khẳng định" },
      { headword: "justify", ipa: "ˈdʒʌstɪfaɪ", partOfSpeech: "verb", definitions: ["to give good reasons for something"], examples: ["Can you justify your decision?"], vi: "biện minh" },
      { headword: "undermine", ipa: "ˌʌndərˈmaɪn", partOfSpeech: "verb", definitions: ["to weaken something gradually, often secretly"], examples: ["Corruption undermines public trust."], vi: "làm suy yếu" },
      { headword: "legitimate", ipa: "lɪˈdʒɪtɪmət", partOfSpeech: "adjective", definitions: ["reasonable and acceptable; conforming to the law"], examples: ["He raised a legitimate concern."], vi: "chính đáng" },
      { headword: "substantial", ipa: "səbˈstænʃl", partOfSpeech: "adjective", definitions: ["large in amount, value, or importance"], examples: ["There was a substantial improvement in sales."], vi: "đáng kể, lớn" },
      { headword: "inevitable", ipa: "ɪnˈevɪtəbl", partOfSpeech: "adjective", definitions: ["certain to happen; unavoidable"], examples: ["Change is inevitable in a growing economy."], vi: "không thể tránh khỏi" },
      { headword: "comprehensive", ipa: "ˌkɒmprɪˈhensɪv", partOfSpeech: "adjective", definitions: ["complete and including everything necessary"], examples: ["The report gives a comprehensive overview."], vi: "toàn diện" },
      { headword: "discrepancy", ipa: "dɪsˈkrepənsi", partOfSpeech: "noun", definitions: ["a difference between things that should be the same"], examples: ["There is a discrepancy between the two reports."], vi: "sự khác biệt" },
      { headword: "versatile", ipa: "ˈvɜːrsətl", partOfSpeech: "adjective", definitions: ["able to adapt to many different functions"], examples: ["She is a versatile musician."], vi: "đa năng" },
    ],
  },
  "band-7-8": {
    "Academic & Critical Thinking": [
      { headword: "meticulous", ipa: "məˈtɪkjələs", partOfSpeech: "adjective", definitions: ["showing great attention to detail; very careful and precise"], examples: ["She is meticulous in her research."], vi: "tỉ mỉ" },
      { headword: "pragmatic", ipa: "præɡˈmætɪk", partOfSpeech: "adjective", definitions: ["dealing with things in a sensible, practical way"], examples: ["We need a pragmatic approach to the problem."], vi: "thực dụng" },
      { headword: "nuanced", ipa: "ˈnjuːɑːnst", partOfSpeech: "adjective", definitions: ["characterized by subtle shades of meaning"], examples: ["He gave a nuanced analysis of the issue."], vi: "tinh tế, nhiều sắc thái" },
      { headword: "paradox", ipa: "ˈpærədɒks", partOfSpeech: "noun", definitions: ["a situation with seemingly contradictory elements"], examples: ["It's a paradox that wealthier countries sometimes waste more."], vi: "nghịch lý" },
      { headword: "discern", ipa: "dɪˈsɜːrn", partOfSpeech: "verb", definitions: ["to recognize or notice something not obvious"], examples: ["It was hard to discern his true intentions."], vi: "nhận ra, phân biệt" },
      { headword: "synthesis", ipa: "ˈsɪnθəsɪs", partOfSpeech: "noun", definitions: ["the combination of ideas to form a theory or system"], examples: ["Her essay is a synthesis of several theories."], vi: "sự tổng hợp" },
      { headword: "rigorous", ipa: "ˈrɪɡərəs", partOfSpeech: "adjective", definitions: ["extremely thorough and careful"], examples: ["The study followed a rigorous methodology."], vi: "chặt chẽ, nghiêm ngặt" },
      { headword: "coherence", ipa: "koʊˈhɪərəns", partOfSpeech: "noun", definitions: ["the quality of being logical and well-organized"], examples: ["The essay lacks coherence between paragraphs."], vi: "tính mạch lạc" },
      { headword: "methodology", ipa: "ˌmeθəˈdɒlədʒi", partOfSpeech: "noun", definitions: ["a system of methods used in research"], examples: ["The paper explains its research methodology in detail."], vi: "phương pháp luận" },
      { headword: "corroborate", ipa: "kəˈrɒbəreɪt", partOfSpeech: "verb", definitions: ["to confirm or support a statement with evidence"], examples: ["New data corroborated the earlier findings."], vi: "xác nhận, củng cố" },
    ],
    "Politics & Policy": [
      { headword: "legislation", ipa: "ˌledʒɪsˈleɪʃn", partOfSpeech: "noun", definitions: ["laws considered as a group"], examples: ["New legislation aims to reduce carbon emissions."], vi: "luật pháp, lập pháp" },
      { headword: "advocate", ipa: "ˈædvəkeɪt", partOfSpeech: "verb", definitions: ["to publicly support a policy or idea"], examples: ["She advocates for stricter environmental laws."], vi: "ủng hộ, biện hộ" },
      { headword: "mitigate", ipa: "ˈmɪtɪɡeɪt", partOfSpeech: "verb", definitions: ["to make something less severe"], examples: ["New laws aim to mitigate pollution."], vi: "giảm nhẹ" },
      { headword: "implement", ipa: "ˈɪmplɪment", partOfSpeech: "verb", definitions: ["to put a plan or decision into effect"], examples: ["The city will implement the new policy next year."], vi: "thực hiện, triển khai" },
      { headword: "jurisdiction", ipa: "ˌdʒʊərɪsˈdɪkʃn", partOfSpeech: "noun", definitions: ["the official power to make legal decisions"], examples: ["The case falls outside the court's jurisdiction."], vi: "thẩm quyền" },
      { headword: "sovereignty", ipa: "ˈsɒvrənti", partOfSpeech: "noun", definitions: ["a nation's independent authority to govern itself"], examples: ["The treaty respects each nation's sovereignty."], vi: "chủ quyền" },
      { headword: "proliferation", ipa: "prəˌlɪfəˈreɪʃn", partOfSpeech: "noun", definitions: ["a rapid increase in the number or amount of something"], examples: ["The proliferation of social media changed communication."], vi: "sự gia tăng nhanh chóng" },
      { headword: "bureaucracy", ipa: "bjʊəˈrɒkrəsi", partOfSpeech: "noun", definitions: ["a system of officials carrying out government rules"], examples: ["Starting a business here involves a lot of bureaucracy."], vi: "bộ máy quan liêu" },
      { headword: "accountability", ipa: "əˌkaʊntəˈbɪləti", partOfSpeech: "noun", definitions: ["being responsible and able to explain one's actions"], examples: ["Voters are demanding greater accountability from politicians."], vi: "trách nhiệm giải trình" },
      { headword: "partisan", ipa: "ˈpɑːrtɪzn", partOfSpeech: "adjective", definitions: ["strongly supporting a particular party or cause"], examples: ["The debate quickly became partisan."], vi: "thiên vị, đảng phái" },
    ],
    "Psychology & Behaviour": [
      { headword: "intrinsic", ipa: "ɪnˈtrɪnsɪk", partOfSpeech: "adjective", definitions: ["belonging naturally to something; essential"], examples: ["Curiosity is an intrinsic part of human nature."], vi: "vốn có" },
      { headword: "detrimental", ipa: "ˌdetrɪˈmentl", partOfSpeech: "adjective", definitions: ["tending to cause harm or damage"], examples: ["Excessive stress can be detrimental to health."], vi: "có hại" },
      { headword: "subconscious", ipa: "ˌsʌbˈkɒnʃəs", partOfSpeech: "noun", definitions: ["the part of the mind not fully aware"], examples: ["Our subconscious often shapes our decisions."], vi: "tiềm thức" },
      { headword: "resilience", ipa: "rɪˈzɪliəns", partOfSpeech: "noun", definitions: ["the ability to recover quickly from difficulty"], examples: ["Her resilience helped her overcome many setbacks."], vi: "khả năng phục hồi" },
      { headword: "empathy", ipa: "ˈempəθi", partOfSpeech: "noun", definitions: ["the ability to understand another person's feelings"], examples: ["Good leaders show empathy toward their team."], vi: "sự đồng cảm" },
      { headword: "perception", ipa: "pərˈsepʃn", partOfSpeech: "noun", definitions: ["the way someone understands or interprets something"], examples: ["Public perception of the policy has shifted."], vi: "nhận thức" },
      { headword: "motivation", ipa: "ˌmoʊtɪˈveɪʃn", partOfSpeech: "noun", definitions: ["the reason or enthusiasm for doing something"], examples: ["Lack of motivation made the project difficult."], vi: "động lực" },
      { headword: "inhibit", ipa: "ɪnˈhɪbɪt", partOfSpeech: "verb", definitions: ["to prevent or slow down a process"], examples: ["Fear can inhibit clear decision-making."], vi: "kìm hãm, ức chế" },
      { headword: "cognitive", ipa: "ˈkɒɡnətɪv", partOfSpeech: "adjective", definitions: ["relating to thinking, knowing, and understanding"], examples: ["The game is designed to improve cognitive skills."], vi: "nhận thức, tư duy" },
      { headword: "ubiquitous", ipa: "juːˈbɪkwɪtəs", partOfSpeech: "adjective", definitions: ["present or found everywhere"], examples: ["Smartphones have become ubiquitous in modern life."], vi: "có mặt khắp nơi" },
    ],
    "Formal & Nuanced Language": [
      { headword: "dichotomy", ipa: "daɪˈkɒtəmi", partOfSpeech: "noun", definitions: ["a division between two opposed things"], examples: ["There's a dichotomy between theory and practice."], vi: "sự phân đôi, đối lập" },
      { headword: "notwithstanding", ipa: "ˌnɒtwɪθˈstændɪŋ", partOfSpeech: "preposition", definitions: ["despite; in spite of"], examples: ["Notwithstanding the risks, she accepted the offer."], vi: "mặc dù" },
      { headword: "henceforth", ipa: "ˌhensˈfɔːrθ", partOfSpeech: "adverb", definitions: ["from this time on"], examples: ["Henceforth, all reports must be submitted by Friday."], vi: "từ nay trở đi" },
      { headword: "prevalent", ipa: "ˈprevələnt", partOfSpeech: "adjective", definitions: ["widespread in a particular area or time"], examples: ["The disease is especially prevalent in rural areas."], vi: "phổ biến" },
      { headword: "succinct", ipa: "səkˈsɪŋkt", partOfSpeech: "adjective", definitions: ["expressed clearly and in few words"], examples: ["Her succinct summary impressed the committee."], vi: "ngắn gọn, súc tích" },
      { headword: "discretion", ipa: "dɪˈskreʃn", partOfSpeech: "noun", definitions: ["the freedom to decide what should be done"], examples: ["The judge used discretion in sentencing."], vi: "quyền tự quyết, sự thận trọng" },
      { headword: "candid", ipa: "ˈkændɪd", partOfSpeech: "adjective", definitions: ["honest and direct, even if unwelcome"], examples: ["He gave a candid assessment of the company's problems."], vi: "thẳng thắn" },
      { headword: "plausible", ipa: "ˈplɔːzəbl", partOfSpeech: "adjective", definitions: ["seeming reasonable or probable"], examples: ["Her explanation sounded plausible."], vi: "hợp lý, có thể tin được" },
      { headword: "exacerbate", ipa: "ɪɡˈzæsərbeɪt", partOfSpeech: "verb", definitions: ["to make a problem worse"], examples: ["Poor planning exacerbated the housing shortage."], vi: "làm trầm trọng thêm" },
      { headword: "unequivocal", ipa: "ˌʌnɪˈkwɪvəkl", partOfSpeech: "adjective", definitions: ["leaving no doubt; completely clear"], examples: ["The results gave an unequivocal answer."], vi: "rõ ràng, dứt khoát" },
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

  let vocabCount = 0;
  let topicCount = 0;
  for (const [stageId, topics] of Object.entries(CEFR_VOCAB_BANK)) {
    const cefrLevel = CEFR_LEVEL_BY_STAGE[stageId] as CefrLevel;
    for (const [topic, words] of Object.entries(topics)) {
      topicCount += 1;
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
          topic,
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
  }
  console.log(
    `Seeded ${vocabCount} CEFR-leveled vocabulary items across ${topicCount} topics in ${Object.keys(CEFR_VOCAB_BANK).length} stages.`,
  );

  // Prune older placeholder words that predate the topic-based bank above (e.g. the original
  // untopiced sample list) so a redeploy doesn't leave stray, uncategorized words behind.
  const currentHeadwords = Object.values(CEFR_VOCAB_BANK).flatMap((topics) =>
    Object.values(topics).flatMap((words) => words.map((w) => w.headword)),
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
