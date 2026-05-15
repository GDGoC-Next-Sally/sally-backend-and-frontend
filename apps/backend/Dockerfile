# 1. Base stage
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate
WORKDIR /app
# pnpm이 패키지를 중복 없이 플랫하게 설치하도록 설정 (Prisma 인식 문제 해결)
RUN echo "shamefully-hoist=true" > .npmrc

# 2. Dependencies stage
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
# 모든 의존성 설치 (빌드에 필요)
RUN pnpm install --filter backend --frozen-lockfile

# 3. Builder stage
FROM base AS builder
RUN apt-get update && apt-get install -y openssl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
# Prisma Client 생성 및 빌드
RUN cd apps/backend && npx prisma generate && npx nest build
# 정적 HTML 파일 복사
RUN mkdir -p apps/backend/dist/src/modules/dev && \
    (cp apps/backend/src/modules/dev/dev-chat.html apps/backend/dist/src/modules/dev/dev-chat.html || true)

# 4. Runner stage
FROM node:20-slim AS runner
WORKDIR /app
# Prisma 실행에 필수적인 openssl 설치
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# 빌드 결과물 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

EXPOSE 3001

# 실행
CMD ["sh", "-c", "if [ -f apps/backend/dist/src/main.js ]; then node apps/backend/dist/src/main.js; else node apps/backend/dist/main.js; fi"]
