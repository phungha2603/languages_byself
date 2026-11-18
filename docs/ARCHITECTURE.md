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
`UsersModule`, `IeltsModule`, `SrsModule`, `ExercisesModule`, `OrchestratorModule`, `AuthModule`, `GradingModule`, và nhóm `tools/`: `DictionaryModule`, `GrammarModule`, `TranslationModule`, `TtsModule`, `SttModule`.

### 7.1b Xác thực (Google Sign-In + JWT)
- `POST /auth/google { idToken, startingStageId? }`: xác minh Google ID token bằng `google-auth-library` (so khớp `aud` với `GOOGLE_CLIENT_IDS`, không cần client secret), tìm hoặc tạo `User` (ưu tiên khớp theo `googleId`, sau đó theo `email` để gắn tài khoản Google vào profile đã tạo thủ công trước đó), rồi phát một JWT (`@nestjs/jwt`, hết hạn sau 30 ngày).
- `POST /users` (tạo thủ công, không qua Google) **cũng phát JWT** để luồng còn lại của API hoạt động nhất quán bất kể cách tài khoản được tạo — hữu ích khi chưa cấu hình Google OAuth hoặc đang phát triển/test.
- `JwtAuthGuard` xác thực Bearer token; `RequireSelfGuard` (chạy sau `JwtAuthGuard`) chặn truy cập nếu `:userId`/`?userId=` trong request khác với `sub` trong token — áp dụng cho mọi endpoint theo-user (`/users/:userId`, `/ielts/users/:userId/*`, `/srs/users/:userId/*`, `/orchestrator/users/:userId/*`, `/exercises/:id/attempts|grade-writing|grade-speaking`). `GET /ielts/stages` và danh sách bài tập (`GET /exercises`) vẫn công khai vì cần hiển thị trước khi đăng nhập.
- **Thiết lập Google OAuth thật** (bắt buộc để nút "Sign in with Google" hoạt động): vào Google Cloud Console → APIs & Services → Credentials → tạo OAuth 2.0 Client ID cho Web (và iOS/Android nếu build app thật) → copy các Client ID vào `apps/mobile/.env` (`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, không bí mật, nhúng thẳng vào client) và `apps/api/.env` (`GOOGLE_CLIENT_IDS`, danh sách phân tách bởi dấu phẩy). Không cần client secret vì backend chỉ xác minh ID token, không đổi code lấy token.

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
| AI Grading (Writing/Speaking) | OpenAI chat completion, JSON mode | Có — `OPENAI_API_KEY` |

Tất cả service đều đứng sau một interface — muốn đổi sang Google Cloud Speech, Azure, DeepL hay self-host Whisper/Coqui/LanguageTool chỉ cần viết lại class service tương ứng, không đụng gì ở orchestrator hay client.

### 7.3b AI Grading — chấm Writing/Speaking theo đúng rubric IELTS
`GradingService` (`apps/api/src/grading/`) dùng một LLM (OpenAI, JSON mode) làm "examiner", nhưng được **neo chặt vào rubric thật** thay vì để mô hình tự bịa tiêu chí:

- `rubrics.ts` tóm tắt (paraphrase, không copy nguyên văn) các đặc điểm phân biệt từng band 4-9 của **4 tiêu chí chính thức** cho mỗi kỹ năng — Writing Task 1: *Task Achievement*, Task 2: *Task Response*, cả hai đều có thêm *Coherence and Cohesion*, *Lexical Resource*, *Grammatical Range and Accuracy*; Speaking: *Fluency and Coherence*, *Lexical Resource*, *Grammatical Range and Accuracy*, *Pronunciation* — tổng hợp từ band descriptor công khai của IELTS (ielts.org).
- Model chấm **độc lập từng tiêu chí** (band 0-9, bước 0.5) kèm rationale, rồi tính overall band bằng đúng quy tắc làm tròn chính thức của IELTS (trung bình 4 tiêu chí; `.25` làm tròn lên `.5`, `.75` làm tròn lên nguyên — xem `roundToIeltsBand`, có unit test).
- Model đồng thời trích xuất lỗi cụ thể (`mistakes`) gắn nhãn chủ điểm ngữ pháp — những lỗi này **chảy thẳng vào `buildWeaknessProfile`** của orchestrator, nên bài luận/bài nói được AI chấm cũng góp phần vào theo dõi điểm yếu và gate mở khoá mốc, không phải một tính năng tách rời.
- `POST /exercises/:id/grade-writing` / `grade-speaking`: chấm + tự ghi `ExerciseAttempt` (score/accuracy quy đổi từ band sang thang 0-100, cộng thêm `bandScore` và `rubricBreakdown` để hiển thị chi tiết). `POST /grading/writing` / `/grading/speaking` là bản độc lập, không gắn với exercise/không lưu, dùng cho luyện nhanh.
- **Giới hạn cần biết**: đây là công cụ luyện tập, không phải điểm thi IELTS chính thức — band số do LLM chấm là ước lượng tham khảo, chưa được hiệu chỉnh (calibrate) với điểm giám khảo thật; với Speaking hiện chấm trên **transcript văn bản** (chưa phân tích phát âm/ngữ điệu từ audio thật — xem mục 9).

### 7.4 Luồng dữ liệu ví dụ: làm 1 bài tập → mở khoá mốc mới
1. Client gọi `POST /exercises/:id/attempts` → lưu `ExerciseAttempt`.
2. Client gọi `GET /orchestrator/users/:id/next-session` → API đọc lại toàn bộ attempt + SRS card gần đây, chạy `buildWeaknessProfile` → `adjustAllDifficulties` (ghi `UserSkillDifficulty` mới) → `planNextSession`, trả kế hoạch buổi học tiếp theo.
3. Khi người học thấy đủ tự tin, gọi `POST /ielts/users/:id/stages/:stageId/evaluate` kèm điểm mock → API tính `evaluateStageExit` + `decideStageGate`, ghi `BandExitEvaluationLog`, và nếu đạt thì cập nhật `UserStageProgress` + `user.currentStageId` sang mốc tiếp theo.

Đã kiểm thử toàn bộ luồng này bằng request thật (không mock) trong quá trình phát triển.

## 8. `apps/mobile` — Expo Router (iOS / Android / Web, 1 codebase)

- **Điều hướng**: 5 tab — Dashboard, Practice, SRS Review, IELTS Roadmap, Settings (Expo Router, file-based).
- **State**: `AppContext` (React Context + AsyncStorage) giữ `apiBaseUrl`, `userId`, `accessToken` (JWT), `stageId` hiện tại — cho phép trỏ app vào bất kỳ server nào (local, staging, production) mà không cần build lại.
- **API client** (`src/api/client.ts`): wrapper `fetch` type-safe, dùng thẳng type từ `@app/shared-types`, tự đính `Authorization: Bearer <token>` vào mọi request khi đã đăng nhập.
- **Đăng nhập**: màn Settings cho chọn mốc IELTS đầu vào, sau đó hoặc bấm "Sign in with Google" (`expo-auth-session`, cần `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` — xem mục 7.1b) hoặc tạo profile thủ công (email/tên) — cả hai đều nhận về một JWT lưu qua `AppContext.login()`.
- **Âm thanh**: dùng `expo-audio` — màn luyện Nghe gọi TTS để phát prompt; màn luyện Nói cho ghi âm + nghe lại. Màn Writing/Speaking có ô nhập bài luận/transcript và nút "Submit for AI grading" gọi thẳng `GradingService`, hiển thị band điểm từng tiêu chí + feedback (xem mục 7.3b).
- Đã build & kiểm thử thật bằng Playwright (không chỉ typecheck): tạo profile/đăng nhập qua UI → gọi API thật (có JWT) → hiển thị đúng weakness profile, next-session plan, roadmap có khoá/mở khoá, SRS review rỗng/có thẻ. Phát hiện và sửa 2 bug thật trong quá trình này: màn Practice Session treo loading vô hạn khi chưa có profile, và `useAuthRequest` của Google Sign-In tạo lại object cấu hình + nonce ngẫu nhiên mỗi lần render gây vòng lặp re-render làm toàn bộ form Settings mất khả năng tương tác (đã sửa bằng `useMemo`).

## 9. Giới hạn hiện tại & việc cần làm tiếp

Đây là **khung kiến trúc đầy đủ với các module triển khai nông** theo đúng phạm vi đã thống nhất — phần lõi (SRS, orchestrator, data model, gate mở khoá) đã triển khai đầy đủ và có test; các phần sau cần đào sâu thêm khi mở rộng:

- **Ngân hàng bài tập**: hiện DB chỉ có cấu trúc `Exercise`, chưa có nội dung thật phong phú theo từng mốc IELTS — cần soạn thủ công hoặc dùng LLM để sinh bài tập theo `stageId`/`difficulty`.
- **AI Grading đã có (mục 7.3b) nhưng Speaking mới chấm trên transcript văn bản** — chưa phân tích phát âm/ngữ điệu trực tiếp từ audio. Cần nối: **upload ghi âm từ mobile lên STT** (client đã ghi âm được bằng `expo-audio`, nhưng chưa có endpoint multipart upload — `SttService` hiện chỉ nhận `audioUrl` có sẵn) → lấy transcript tự động thay vì người dùng tự gõ lại.
- **Band số do AI chấm là ước lượng luyện tập, chưa hiệu chỉnh với giám khảo thật** — phù hợp để luyện và theo dõi tiến bộ, không nên dùng thay thế bài thi thử có giám khảo người khi cần độ chính xác cao.
- **Google Sign-In đã có đủ code (mục 7.1b) nhưng cần Client ID thật** — tạo OAuth 2.0 Client ID trên Google Cloud Console và điền vào `apps/mobile/.env` + `apps/api/.env` (`GOOGLE_CLIENT_IDS`) thì nút "Sign in with Google" mới hoạt động; chưa có Client ID thì vẫn dùng được app qua lối tạo profile thủ công (cũng được phát JWT như nhau).
- **Build app thật cho iOS/Android**: đã export được bundle Web tĩnh (`expo export -p web`, deploy được lên bất kỳ static host nào); build `.ipa`/`.apk` cần chạy qua **EAS Build** (`eas build --platform ios|android`), ngoài phạm vi môi trường hiện tại.
- **TTS/STT/Translation/AI Grading** cần biến môi trường `OPENAI_API_KEY` (xem `apps/api/.env.example`) mới gọi thật được.

## 10. Deploy lên Railway — 1 URL dùng được cả web lẫn điện thoại, không cần terminal

Repo được chuẩn bị để chạy như **một service duy nhất**: `Dockerfile` ở gốc repo build cả API lẫn bản Web của app di động, rồi NestJS tự phục vụ luôn bản Web đó (static files + fallback cho client-side routing) từ cùng một origin với API — nên chỉ cần deploy một lần, có một URL, mở URL đó trên máy tính hay điện thoại đều là app đầy đủ, không cần cấu hình IP/port gì thêm (mobile tự nhận API cùng domain, xem `resolveDefaultApiBaseUrl` trong `AppContext.tsx`).

### Các bước (toàn bộ qua giao diện web, không cần terminal)

1. Vào [railway.com](https://railway.com) → đăng nhập bằng GitHub → **New Project** → **Deploy from GitHub repo** → chọn repo `languages_byself`, branch `claude/kind-carson-4lyqn0` (hoặc branch bạn đang dùng).
2. Railway sẽ tự phát hiện `Dockerfile` ở gốc repo và build theo đó — không cần chỉnh gì ở bước này.
3. Trong project vừa tạo, bấm **+ New** → **Database** → **Add PostgreSQL**. Railway tự tạo biến `DATABASE_URL` cho service Postgres này.
4. Quay lại service chạy code (API), vào tab **Variables**, thêm các biến:
   - `DATABASE_URL` → bấm "Add Reference" và chọn biến `DATABASE_URL` của service Postgres vừa tạo (để 2 service tự nối với nhau, không gõ tay connection string).
   - `JWT_SECRET` → dán một chuỗi ngẫu nhiên dài (có thể copy thẳng giá trị mẫu trong `apps/api/.env.example`, hoặc bấm "Generate" nếu Railway có sẵn nút đó).
   - `OPENAI_API_KEY` (tuỳ chọn) → chỉ cần nếu muốn TTS/STT/Dịch/AI Grading hoạt động thật.
   - `GOOGLE_CLIENT_IDS` (tuỳ chọn) → chỉ cần nếu muốn nút "Sign in with Google" hoạt động thật (xem mục 7.1b).
5. Vào tab **Settings** của service, mục **Networking** → bấm **Generate Domain** để có một URL công khai dạng `https://ten-du-an.up.railway.app`.
6. Chờ build xong (vài phút cho lần đầu) → mở URL đó. **Đó chính là cả app**: trên máy tính mở bằng trình duyệt bất kỳ; trên điện thoại mở cùng URL đó bằng Safari/Chrome, có thể bấm "Thêm vào màn hình chính" để dùng như app mà không cần lên App Store/CH Play.

Mỗi lần bạn (hoặc Claude) push code mới lên nhánh đã nối, Railway tự build & deploy lại — không cần làm lại các bước trên.

### Vì sao kiến trúc này hoạt động (đã kiểm chứng thật trong lúc phát triển)

`Dockerfile` build theo đúng trình tự: cài dependencies toàn repo → build `packages/*` + `apps/api` (qua turborepo, tự xử lý đúng thứ tự phụ thuộc) → build bản Web của `apps/mobile` (`expo export -p web`) → copy bản Web đó vào `apps/api/public`. Khi container khởi động, `docker-entrypoint.sh` chạy `prisma migrate deploy` rồi seed dữ liệu mẫu (an toàn chạy lại nhiều lần) trước khi start server — nên **database luôn tự migrate + có dữ liệu mẫu mà không cần bạn chạy lệnh gì**.

Trong `apps/api/src/main.ts`, static file (JS/CSS/ảnh của bản Web) được đăng ký thẳng trên Express *trước khi* NestJS gắn các route — nên luôn được phục vụ đúng; `SpaFallbackController` (loại trừ khỏi prefix `/api`, import sau cùng trong `AppModule`) phục vụ `index.html` cho mọi đường dẫn còn lại (vd. tải thẳng `/srs`) để điều hướng phía client của app hoạt động đúng cả khi refresh trang — nhưng vẫn trả JSON 404 sạch cho các request `/api/*` không tồn tại. Thứ tự này rất dễ sai (ban đầu code catch-all đã vô tình "nuốt" luôn API thật hoặc static file thật) nên nếu bạn chỉnh sửa phần này, hãy kiểm tra lại cả 3 trường hợp: file tĩnh thật, API thật, và route phía client không có file thật tương ứng.
