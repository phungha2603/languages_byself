# Kiến trúc hệ thống — English Coach

Hệ thống AI Agent tự học tiếng Anh cá nhân hoá: luyện đủ 4 kỹ năng (Nghe — Đọc — Nói — Viết), tích hợp TTS/STT, Dịch & Từ điển, Grammar Parser, SRS (Spaced Repetition), và một **orchestrator tự trị** theo dõi điểm yếu, tự điều chỉnh độ khó, và chỉ mở khoá mốc IELTS tiếp theo khi đạt tiêu chí đầu ra. Chạy được trên web và điện thoại từ cùng một codebase.

## 1. Nguyên tắc thiết kế

- **Một codebase, nhiều nền tảng**: client dùng Expo (React Native + Web), server dùng NestJS/TypeScript — toàn bộ type domain (`Skill`, `Exercise`, `SrsCard`, `WeaknessProfile`, ...) định nghĩa một lần trong `packages/shared-types` và dùng chung ở cả hai đầu.
- **Orchestrator là pure logic, tách khỏi I/O**: `packages/orchestrator` và `packages/srs-engine` là các hàm thuần (pure functions), không phụ thuộc NestJS/Prisma/HTTP — dễ unit test (35 test đã viết, toàn bộ pass) và có thể tái sử dụng ở nơi khác (ví dụ chạy batch job tối ưu lại độ khó hàng đêm).
- **Mỗi "tool" (TTS/STT/Dịch/Từ điển/Grammar) là một service độc lập, có thể thay nhà cung cấp**: interface giữ nguyên, implementation có thể đổi từ OpenAI sang Google/DeepL/self-host mà không đụng vào orchestrator hay client.
- **Gate theo dữ liệu thật, không phải tự khai báo**: việc mở khoá mốc IELTS tiếp theo dựa trên số liệu đo được (accuracy, SRS retention, số bài đã làm, điểm mock) chứ không phải người dùng tự bấm "tôi xong rồi".

## 2. Sơ đồ tổng thể

```
┌─────────────────────────┐        ┌─────────────────────────┐
│   apps/mobile (Expo)     │        │   apps/mobile — Web      │
│   iOS / Android client   │        │   (react-native-web)     │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │              HTTPS (fetch)         │
             └───────────────────┬────────────────┘
                                  ▼
                     ┌─────────────────────────┐
                     │   apps/api (NestJS)      │
                     │  Users / IELTS / SRS /    │
                     │  Exercises / Orchestrator │
                     │  / Tools (TTS/STT/Dict/   │
                     │    Translation/Grammar)   │
                     └──┬───────────┬───────────┘
                         │           │
          ┌──────────────┘           └───────────────┐
          ▼                                            ▼
┌───────────────────┐                      ┌───────────────────────┐
│  PostgreSQL (Prisma)│                      │  External APIs         │
│  users, exercises,  │                      │  OpenAI (TTS/STT/dịch),│
│  srs_cards, attempts│                      │  dictionaryapi.dev,    │
│  weakness snapshots │                      │  languagetool.org      │
└───────────────────┘                      └───────────────────────┘

             packages/shared-types  ──┐
             packages/srs-engine    ──┼── dùng chung bởi apps/api và apps/mobile
             packages/orchestrator  ──┘   (orchestrator chỉ dùng trong api)
```

## 3. Cấu trúc monorepo

```
languages_byself/
├── apps/
│   ├── api/        NestJS backend (TypeScript, Prisma + Postgres)
│   └── mobile/      Expo Router app — chạy iOS/Android/Web từ 1 codebase
├── packages/
│   ├── shared-types/  Domain model & kiểu dữ liệu dùng chung
│   ├── srs-engine/    Thuật toán FSRS-4.5 (spaced repetition) — thuần TS, có test
│   └── orchestrator/  Logic "AI agent": weakness tracking, difficulty, stage gate
├── infra/
│   └── docker-compose.yml   Postgres local
└── docs/
    └── ARCHITECTURE.md (tài liệu này)
```

Quản lý bằng **pnpm workspaces + turborepo**. Mỗi package/app có `build`, `typecheck`, `test` riêng, chạy đồng thời qua `pnpm test` ở root.

## 4. `packages/shared-types` — domain model dùng chung

Định nghĩa toàn bộ "ngôn ngữ chung" giữa backend và client:

- `Skill` = `listening | speaking | reading | writing`.
- `IeltsBandStage` + `BandExitCriteria`: 5 mốc mặc định (Foundation → Band 7-8+), mỗi mốc có tiêu chí đầu ra riêng (độ chính xác tối thiểu/kỹ năng, số bài tối thiểu, % retention từ vựng, điểm mock tối thiểu, số lỗi ngữ pháp tồn đọng tối đa).
- `Exercise`, `ExerciseAttempt`, `Mistake`: loại bài tập cho từng kỹ năng (vd. `listening_dictation`, `speaking_cue_card`, `writing_task2_essay`, `grammar_cloze`, `vocab_flashcard`...).
- `SrsCard`, `SrsRating`, `SrsReviewLogEntry`: trạng thái SRS theo chuẩn FSRS.
- `WeaknessProfile`, `GrammarWeakness`, `VocabWeakness`: "chân dung năng lực" của người học tại một thời điểm.
- `NextSessionPlan`, `DifficultyAdjustment`, `StageGateDecision`: đầu ra của orchestrator.
- `TtsRequest/Result`, `SttRequest/Result`, `GrammarCheckResult`, `TranslationResult`, `DictionaryLookupResult`: hợp đồng cho các "tool".

## 5. `packages/srs-engine` — Spaced Repetition (FSRS-4.5)

Triển khai thuật toán **FSRS-4.5** (thế hệ sau SM-2, chính xác hơn Anki mặc định cũ), theo đúng công thức công bố bởi dự án open-spaced-repetition:

- Đường cong quên: `R(t,S) = (1 + FACTOR·t/S)^DECAY` với `DECAY=-0.5`, `FACTOR=19/81`.
- Cập nhật độ khó (`difficulty`) có "mean reversion" để không bị lệch sau một lần trả lời may rủi.
- Cập nhật độ bền trí nhớ (`stability`) khác nhau cho trả lời đúng (Hard/Good/Easy) và quên (Again/lapse).
- `FsrsScheduler.review(card, rating, now)` → thẻ mới + log review (dùng để tính retention).
- `computeRetentionStats(cards, ...)` → % từ vựng còn nhớ, số thẻ "mature", số thẻ tới hạn — là đầu vào trực tiếp cho stage-gate.

14 unit test kiểm tra: tính đơn điệu của stability/difficulty theo rating, chu kỳ ôn tăng dần khi trả lời đúng liên tục, sụt mạnh khi quên (lapse), v.v.

## 6. `packages/orchestrator` — "bộ não" tự trị

Đây là phần triển khai yêu cầu cốt lõi: **tự động theo dõi điểm yếu, điều chỉnh độ khó, và chỉ mở khoá giai đoạn tiếp theo khi đủ tiêu chí**.

### 6.1 Theo dõi điểm yếu (`buildWeaknessProfile`)
- `skillMastery`: % chính xác trung bình của 10 lần làm bài gần nhất / kỹ năng (chưa có dữ liệu → 0%, ưu tiên luyện để có dữ liệu thay vì giả định là đã giỏi).
- `grammarWeaknesses`: gom các lỗi ngữ pháp lặp lại theo chủ điểm (`present_perfect`, `article_usage`...), mỗi lần lặp lại trừ điểm "mastery" của chủ điểm đó.
- `vocabWeaknesses`: từ vựng bị quên nhiều lần trong SRS (lapses cao), sắp xếp từ tệ nhất.

### 6.2 Điều chỉnh độ khó (`adjustDifficulty`)
Bộ điều khiển kiểu "hill-climbing" đơn giản, mục tiêu giữ người học trong vùng 60–85% chính xác (vùng học hiệu quả nhất — không quá dễ gây chán, không quá khó gây nản):
- Accuracy ≥ 85% → tăng độ khó +0.5 (thang 1–10).
- Accuracy ≤ 60% → giảm độ khó −0.5.
- Trong khoảng 60–85% → giữ nguyên.

### 6.3 Lập kế hoạch buổi học (`planNextSession`)
- Chọn 2 kỹ năng có `mastery` thấp nhất làm trọng tâm.
- Gắn loại bài tập phù hợp + độ khó đã tinh chỉnh cho từng kỹ năng.
- Gài thêm các chủ điểm ngữ pháp/từ vựng yếu cần "nhồi" lại (`reinforceGrammarTopics`, `reinforceVocabIds`).
- Trả về `rationale`: lý do dễ hiểu bằng ngôn ngữ tự nhiên, hiển thị thẳng lên Dashboard.

### 6.4 Mở khoá mốc IELTS (`evaluateStageExit` + `decideStageGate`)
So khớp `WeaknessProfile` + SRS retention + số bài đã hoàn thành + điểm mock với `BandExitCriteria` của mốc hiện tại:
- Đạt **tất cả** tiêu chí → `unlock_next_stage` (mở khoá mốc kế tiếp, lưu lịch sử đánh giá).
- Không đạt nhưng lệch nhẹ → `stay_in_stage` (tiếp tục luyện ở mốc hiện tại).
- Không đạt và lệch nặng (quá nhiều lỗi ngữ pháp tồn đọng hoặc retention từ vựng tụt sâu) → `remediate` (gợi ý quay lại củng cố nền tảng trước khi luyện tiếp).

Toàn bộ logic trên là **hàm thuần, không gọi DB/HTTP** → test được 21 ca độc lập với mock data, không cần Postgres.

## 7. `apps/api` — NestJS backend

### 7.1 Module hoá theo domain
`UsersModule`, `IeltsModule`, `SrsModule`, `ExercisesModule`, `OrchestratorModule`, và nhóm `tools/`: `DictionaryModule`, `GrammarModule`, `TranslationModule`, `TtsModule`, `SttModule`.

### 7.2 Database (Prisma + PostgreSQL)
Schema đầy đủ ở `apps/api/prisma/schema.prisma`: `User`, `IeltsStage` (dữ liệu tham chiếu, seed sẵn 5 mốc), `UserStageProgress`, `BandExitEvaluationLog` (lịch sử đánh giá gate — audit trail), `WeaknessProfileSnapshot` (cache kết quả orchestrator), `VocabItem`, `SrsCard`, `SrsReviewLog`, `Exercise`, `ExerciseAttempt`, `UserSkillDifficulty`, `StudySession`.

### 7.3 Tích hợp các "tool" theo đúng yêu cầu
| Tool | Nhà cung cấp hiện tại | Cần API key? |
|---|---|---|
| Dictionary | [dictionaryapi.dev](https://dictionaryapi.dev) (miễn phí) + cache Postgres | Không |
| Grammar Parser | [LanguageTool](https://languagetool.org) public API | Không (free tier) |
| TTS | OpenAI `tts-1` | Có — `OPENAI_API_KEY` |
| STT | OpenAI `whisper-1` | Có — `OPENAI_API_KEY` |
| Translation | OpenAI chat completion (`gpt-4o-mini`) | Có — `OPENAI_API_KEY` |

Tất cả service đều đứng sau một interface — muốn đổi sang Google Cloud Speech, Azure, DeepL hay self-host Whisper/Coqui/LanguageTool chỉ cần viết lại class service tương ứng, không đụng gì ở orchestrator hay client.

### 7.4 Luồng dữ liệu ví dụ: làm 1 bài tập → mở khoá mốc mới
1. Client gọi `POST /exercises/:id/attempts` → lưu `ExerciseAttempt`.
2. Client gọi `GET /orchestrator/users/:id/next-session` → API đọc lại toàn bộ attempt + SRS card gần đây, chạy `buildWeaknessProfile` → `adjustAllDifficulties` (ghi `UserSkillDifficulty` mới) → `planNextSession`, trả kế hoạch buổi học tiếp theo.
3. Khi người học thấy đủ tự tin, gọi `POST /ielts/users/:id/stages/:stageId/evaluate` kèm điểm mock → API tính `evaluateStageExit` + `decideStageGate`, ghi `BandExitEvaluationLog`, và nếu đạt thì cập nhật `UserStageProgress` + `user.currentStageId` sang mốc tiếp theo.

Đã kiểm thử toàn bộ luồng này bằng request thật (không mock) trong quá trình phát triển.

## 8. `apps/mobile` — Expo Router (iOS / Android / Web, 1 codebase)

- **Điều hướng**: 5 tab — Dashboard, Practice, SRS Review, IELTS Roadmap, Settings (Expo Router, file-based).
- **State**: `AppContext` (React Context + AsyncStorage) giữ `apiBaseUrl`, `userId`, `stageId` hiện tại — cho phép trỏ app vào bất kỳ server nào (local, staging, production) mà không cần build lại.
- **API client** (`src/api/client.ts`): wrapper `fetch` type-safe, dùng thẳng type từ `@app/shared-types`.
- **Âm thanh**: dùng `expo-audio` — màn luyện Nghe gọi TTS để phát prompt; màn luyện Nói cho ghi âm + nghe lại (pipeline tải lên server để STT chấm điểm tự động là việc cần làm tiếp, xem mục 9).
- Đã build & kiểm thử thật bằng Playwright (không chỉ typecheck): tạo profile qua UI → gọi API thật → hiển thị đúng weakness profile, next-session plan, roadmap có khoá/mở khoá, SRS review rỗng/có thẻ. Phát hiện và sửa 1 bug thật (màn Practice Session bị treo loading vô hạn khi chưa có profile).

## 9. Giới hạn hiện tại & việc cần làm tiếp

Đây là **khung kiến trúc đầy đủ với các module triển khai nông** theo đúng phạm vi đã thống nhất — phần lõi (SRS, orchestrator, data model, gate mở khoá) đã triển khai đầy đủ và có test; các phần sau cần đào sâu thêm khi mở rộng:

- **Ngân hàng bài tập**: hiện DB chỉ có cấu trúc `Exercise`, chưa có nội dung thật phong phú theo từng mốc IELTS — cần soạn thủ công hoặc dùng LLM để sinh bài tập theo `stageId`/`difficulty`.
- **Chấm điểm tự động**: bài Nói/Viết hiện để người học tự đánh giá (self-rating) khi submit attempt; cần nối thêm: STT → so khớp phát âm/ngữ pháp, hoặc dùng LLM chấm theo rubric IELTS (band descriptor) cho Writing Task 1/2 và Speaking.
- **Upload ghi âm từ mobile lên STT**: client đã ghi âm được (`expo-audio`), nhưng chưa có endpoint upload file lên server để `SttService` xử lý (hiện `SttService` nhận `audioUrl` sẵn có) — cần thêm 1 endpoint multipart upload.
- **Auth**: chưa có đăng nhập thật (JWT/OAuth) — user hiện tạo thủ công qua `POST /users`, phù hợp giai đoạn cá nhân dùng một mình; cần thêm khi có nhiều người dùng.
- **Build app thật cho iOS/Android**: đã export được bundle Web tĩnh (`expo export -p web`, deploy được lên bất kỳ static host nào); build `.ipa`/`.apk` cần chạy qua **EAS Build** (`eas build --platform ios|android`), ngoài phạm vi môi trường hiện tại.
- **TTS/STT/Translation** cần biến môi trường `OPENAI_API_KEY` (xem `apps/api/.env.example`) mới gọi thật được.
