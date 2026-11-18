#!/bin/sh
set -e

# Runs on every container start (cheap and idempotent either way):
# applies any migrations the running image's schema needs, then seeds the
# IELTS stages + sample vocab/exercises (upsert/skip-if-exists, safe to
# repeat), then starts the API — which also serves the mobile web build
# baked into ./public at build time. See apps/api/src/main.ts.
npx prisma migrate deploy --schema=prisma/schema.prisma
node --env-file-if-exists=.env -r ts-node/register prisma/seed.ts
exec node dist/main.js
