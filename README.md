# English Coach

AI Agent tự học tiếng Anh cá nhân hoá — đủ 4 kỹ năng (Nghe/Nói/Đọc/Viết), TTS/STT, Dịch & Từ điển, Grammar Parser, Spaced Repetition (FSRS), và một orchestrator tự trị theo dõi điểm yếu, tự điều chỉnh độ khó, chỉ mở khoá mốc IELTS tiếp theo khi đạt tiêu chí đầu ra. Chạy trên web và điện thoại từ cùng một codebase.

Kiến trúc chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Cấu trúc

```
apps/api/        Backend NestJS (TypeScript + Prisma + PostgreSQL)
apps/mobile/      Client Expo Router (iOS / Android / Web)
packages/shared-types/  Domain model dùng chung
packages/srs-engine/    Thuật toán FSRS-4.5 (spaced repetition)
packages/orchestrator/  Logic AI agent: weakness tracking, difficulty, stage gate
infra/            docker-compose cho PostgreSQL local
```

## Chạy local

### 1. Cài đặt

```bash
pnpm install
```

### 2. Khởi động PostgreSQL

```bash
docker compose -f infra/docker-compose.yml up -d
```

(Nếu không dùng Docker, trỏ `DATABASE_URL` tới một PostgreSQL có sẵn.)

### 3. Cấu hình & migrate backend

```bash
cp apps/api/.env.example apps/api/.env
cd apps/api
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

API chạy ở `http://localhost:3000/api`. TTS/STT/Translation cần thêm `OPENAI_API_KEY` vào `apps/api/.env` — Dictionary và Grammar dùng API miễn phí (dictionaryapi.dev, languagetool.org), không cần key.

### 4. Chạy app

```bash
cd apps/mobile
pnpm start       # mở Expo Dev Tools, quét QR bằng Expo Go
pnpm web         # chạy trên trình duyệt
```

Mở tab **Settings** trong app để trỏ "API base URL" (mặc định `http://localhost:3000/api`) và tạo profile.

## Kiểm thử

```bash
pnpm test        # chạy toàn bộ test ở mọi package/app (turbo)
```

`packages/srs-engine` và `packages/orchestrator` có unit test đầy đủ cho thuật toán FSRS và logic orchestrator (weakness tracking, difficulty adjustment, stage gating).
