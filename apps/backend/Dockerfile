FROM node:20-slim AS base

# Prisma 실행에 필요한 시스템 패키지들 설치
RUN apt-get update && apt-get install -y python3 build-essential openssl
ENV PYTHON=/usr/bin/python3

# 코어팩 활성화 및 pnpm 설치
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate

WORKDIR /app

# pnpm이 가짜 링크(심볼릭 링크)를 쓰지 않고 모든 패키지를 플랫하게 설치하도록 강제
RUN echo "shamefully-hoist=true" > .npmrc

# 모노레포 모든 설정 파일 및 package.json 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY apps/ai_server/package.json ./apps/ai_server/

# 전체 의존성 설치
RUN pnpm install

# 소스 코드 복사
COPY apps/backend ./apps/backend

# [추가] dev-chat.html 경로 에러 해결을 위해 파일 복사
RUN mkdir -p /app/src/modules/dev && cp /app/apps/backend/src/modules/dev/dev-chat.html /app/src/modules/dev/dev-chat.html

# Prisma Client 생성
RUN cd apps/backend && npx prisma generate

# 빌드
RUN cd apps/backend && npx nest build

EXPOSE 3001

# 실행 (dist/src/main.js가 있으면 실행하고, 없으면 dist/main.js 실행)
CMD ["sh", "-c", "if [ -f apps/backend/dist/src/main.js ]; then node apps/backend/dist/src/main.js; else node apps/backend/dist/main.js; fi"]
