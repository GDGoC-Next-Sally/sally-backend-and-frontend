FROM node:20-alpine

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 모노레포 설정 파일 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# 의존성 설치
RUN pnpm install --filter backend

# 소스 코드 복사
COPY apps/backend ./apps/backend

# Prisma Client 생성 (중요!)
RUN cd apps/backend && npx prisma generate

# 빌드
RUN pnpm --filter backend build

EXPOSE 3001

# NestJS 실행
CMD ["pnpm", "--filter", "backend", "start:prod"]
