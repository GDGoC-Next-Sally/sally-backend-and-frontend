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

# Multer 타입 에러 해결을 위해 강제 설치 (임시 조치)
RUN cd apps/backend && pnpm add -D @types/multer

# Prisma Client 생성 (중요!)
RUN cd apps/backend && npx prisma generate

# 빌드
RUN cd apps/backend && npx nest build

EXPOSE 3001

# 실행 (dist/src/main.js가 있으면 실행하고, 없으면 dist/main.js 실행)
CMD ["sh", "-c", "if [ -f apps/backend/dist/src/main.js ]; then node apps/backend/dist/src/main.js; else node apps/backend/dist/main.js; fi"]
