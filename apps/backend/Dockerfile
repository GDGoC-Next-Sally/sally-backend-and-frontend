FROM node:20-alpine AS builder

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 모노레포 설정 파일 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# 의존성 설치
RUN pnpm install --filter backend

# 소스 코드 복사 및 빌드
COPY apps/backend ./apps/backend
RUN pnpm --filter backend build

# 실행 단계
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# 프로덕션 의존성만 설치
RUN pnpm install --filter backend --prod

# 빌드된 결과물 복사
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3001

# NestJS 실행 (package.json의 start:prod 스크립트 실행)
CMD ["pnpm", "--filter", "backend", "start:prod"]
