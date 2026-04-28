# 🤖 Sally AI Coach

AI를 활용한 실시간 코칭 및 학습 관리 플랫폼, **Sally AI Coach**의 메인 프론트엔드 및 백엔드 코드입니다.  

## 🏗️ Architecture & Tech Stack

본 프로젝트는 효율적인 코드 관리와 공유를 위해 **pnpm workspace 기반의 모노레포** 구조로 설계되었습니다.

### 💻 Technology Stack
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Zustand, Supabase Auth
- **Backend**: NestJS, Prisma ORM, Passport (JWT/ES256), Redis
- **Infra/Database**: Supabase (PostgreSQL, Auth, Storage), Redis (AI Task Queue)

## 📂 Project Structure
```text
sally-ai-coach/
├── apps/
│   ├── frontend/     # Next.js 클라이언트 애플리케이션
│   └── backend/      # NestJS 백엔드 API 서버
├── package.json      # 워크스페이스 의존성 및 통합 스크립트 관리
└── pnpm-workspace.yaml
```

## 🚀 Getting Started

### 1. 필수 준비물 (Prerequisites)
- Node.js (v18 이상 권장)
- pnpm (`npm install -g pnpm`)

### 2. 의존성 설치 (Installation)
```bash
# 루트 폴더에서 실행
pnpm install
```

### 3. 환경 변수 설정 (Environment Variables)
`apps/frontend`와 `apps/backend` 각각의 폴더에 `.env` 파일을 설정해야 합니다.

**Backend (`apps/backend/.env`)**
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `SERVICE_ROLE_KEY`: Supabase 서비스 롤 키 (백엔드 전용)

**Frontend (`apps/frontend/.env.local`)**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키

### 4. 개발 서버 실행 (Development)
```bash
# 프론트엔드와 백엔드 동시 실행
pnpm run dev
```

## 🛠️ Key Features (Current Implementation)

### 🔐 Authentication System
- **Frontend**: (auth) Route Group을 통한 로그인/회원가입 페이지 및 세션 관리
- **Backend**: Passport 기반의 JWT 전략(ES256/JWKS 방식)을 통한 보안 API 구현 완료