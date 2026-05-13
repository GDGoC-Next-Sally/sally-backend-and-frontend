FROM node:20-alpine AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 모노레포 설정 파일 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/

# 의존성 설치
RUN pnpm install --filter frontend

# 소스 코드 복사
COPY apps/frontend ./apps/frontend

# Next.js 빌드 시 필요한 환경 변수 (빌드 타임에 주입되어야 클라이언트 코드에 포함됨)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# 빌드
RUN pnpm --filter frontend build

# 실행 단계
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/

# 프로덕션 의존성만 설치
RUN pnpm install --filter frontend --prod

# 빌드된 결과물 복사
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

# Next.js 실행
CMD ["pnpm", "--filter", "frontend", "start"]
