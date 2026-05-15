# 1. Base stage
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate
WORKDIR /app

# 2. Dependencies stage (의존성 설치만 담당)
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
# 백엔드에 필요한 의존성만 설치
RUN pnpm install --filter backend --frozen-lockfile

# 3. Builder stage (빌드 담당)
FROM base AS builder
# Prisma 실행에 필요한 시스템 패키지 설치
RUN apt-get update && apt-get install -y openssl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
# Prisma Client 생성 및 빌드
RUN cd apps/backend && npx prisma generate && npx nest build

# 4. Runner stage (실제 실행 담당 - 최경량)
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

# HTML 등 정적 파일이 필요한 경우 복사
COPY --from=builder /app/apps/backend/src/modules/dev/dev-chat.html ./apps/backend/dist/src/modules/dev/dev-chat.html || true

EXPOSE 3001

# 실행 (최적화된 경로로 바로 실행)
CMD ["sh", "-c", "if [ -f apps/backend/dist/src/main.js ]; then node apps/backend/dist/src/main.js; else node apps/backend/dist/main.js; fi"]
