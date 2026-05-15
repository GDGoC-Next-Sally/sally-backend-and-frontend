# 1. Base stage
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate
WORKDIR /app

# 2. Dependencies stage
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --filter backend --frozen-lockfile

# 3. Builder stage
FROM base AS builder
RUN apt-get update && apt-get install -y openssl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
# Prisma Client 생성 및 빌드
RUN cd apps/backend && npx prisma generate && npx nest build
# 정적 HTML 파일이 있다면 dist 폴더로 미리 복사 (에러 방지)
RUN mkdir -p apps/backend/dist/src/modules/dev && \
    (cp apps/backend/src/modules/dev/dev-chat.html apps/backend/dist/src/modules/dev/dev-chat.html || true)

# 4. Runner stage
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# 빌드 결과물과 프로덕션용 패키지만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

EXPOSE 3001

# 실행
CMD ["sh", "-c", "if [ -f apps/backend/dist/src/main.js ]; then node apps/backend/dist/src/main.js; else node apps/backend/dist/main.js; fi"]
