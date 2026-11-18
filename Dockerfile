# Single-service deployment: this image builds and serves both the API
# and the mobile app's web build from one Node process, so one deploy on
# Railway gives you one URL that works as the whole app — see
# docs/ARCHITECTURE.md "Deploy to Railway" for the exact setup steps.
FROM node:22-bookworm-slim

# Prisma's query engine needs libssl at runtime; bookworm-slim doesn't
# install it by default.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile

# Must run before the build below: apps/api's source imports @prisma/client
# types, which only exist once generated — without this, tsc silently
# treats Prisma model fields as `any` instead of failing, which then
# surfaces as "implicitly has an 'any' type" errors on code that looks
# fine. DATABASE_URL just needs to be *set* here, not reachable — the
# real one is injected by Railway at container start, not baked into the
# image.
RUN cd apps/api && DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma generate

# Builds packages/shared-types, packages/srs-engine, packages/orchestrator
# and apps/api, in dependency order (turbo resolves it from each
# package's own `build` script).
RUN pnpm exec turbo run build --filter=@app/api

# Builds the mobile app as a static web bundle and copies it into the
# API's static root (see apps/api/src/main.ts) so the API serves it too.
ENV CI=1
RUN cd apps/mobile && pnpm run build:web
RUN mkdir -p apps/api/public && cp -r apps/mobile/dist/. apps/api/public/

ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/apps/api
ENTRYPOINT ["/app/docker-entrypoint.sh"]
