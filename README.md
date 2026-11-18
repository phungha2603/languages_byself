# English Coach

AI Agent tự học tiếng Anh cá nhân hoá — đủ 4 kỹ năng (Nghe/Nói/Đọc/Viết), TTS/STT, Dịch & Từ điển, Grammar Parser, Spaced Repetition (FSRS), và một orchestrator tự trị theo dõi điểm yếu, tự điều chỉnh độ khó, chỉ mở khoá mốc IELTS tiếp theo khi đạt tiêu chí đầu ra. Chạy trên web và điện thoại từ cùng một codebase.

Kiến trúc chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Dùng ngay, không cần terminal

Cách đơn giản nhất để dùng app (cả trên máy tính lẫn điện thoại) là **deploy 1 lần lên Railway**, sau đó chỉ cần mở 1 đường link — xem hướng dẫn từng bước ở [docs/ARCHITECTURE.md §10](docs/ARCHITECTURE.md#10-deploy-lên-railway--1-url-dùng-được-cả-web-lẫn-điện-thoại-không-cần-terminal). Phần bên dưới là chạy local để phát triển/debug.

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
# .env.example đã có sẵn JWT_SECRET ngẫu nhiên; nếu tự tạo lại, dùng: openssl rand -hex 32
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

API chạy ở `http://localhost:3000/api`. TTS/STT/Translation/AI Grading cần thêm `OPENAI_API_KEY` vào `apps/api/.env` — Dictionary và Grammar dùng API miễn phí (dictionaryapi.dev, languagetool.org), không cần key. Đăng nhập Google cần `GOOGLE_CLIENT_IDS` (xem [docs/ARCHITECTURE.md §7.1b](docs/ARCHITECTURE.md)) — không có cũng không sao, app vẫn dùng được qua tạo profile thủ công.

### 4. Chạy app

```bash
cd apps/mobile
cp .env.example .env   # điền EXPO_PUBLIC_GOOGLE_*_CLIENT_ID nếu muốn bật Sign in with Google
pnpm start       # mở Expo Dev Tools, quét QR bằng Expo Go
pnpm web         # chạy trên trình duyệt
```

Mở tab **Settings** trong app để trỏ "API base URL" (mặc định `http://localhost:3000/api`), chọn mốc IELTS muốn bắt đầu, rồi đăng nhập Google hoặc tạo profile thủ công.

## Kiểm thử

```bash
pnpm test        # chạy toàn bộ test ở mọi package/app (turbo)
```

`packages/srs-engine` và `packages/orchestrator` có unit test đầy đủ cho thuật toán FSRS và logic orchestrator (weakness tracking, difficulty adjustment, stage gating).
