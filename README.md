# 🤖 Sally AI Coach

AI를 활용한 실시간 코칭 및 학습 관리 플랫폼, **Sally AI Coach**의 전체 소스코드입니다.  

## 🏗️ Architecture & Tech Stack

본 프로젝트는 효율적인 코드 관리와 공유를 위해 **pnpm workspace 기반의 모노레포** 구조로 설계되었습니다.
(프론트엔드와 백엔드는 Node.js 생태계를 공유하며, AI 서버는 Python FastAPI로 독립적으로 동작합니다.)

### 💻 Technology Stack
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Zustand, Supabase Auth
- **Backend (API)**: NestJS, Prisma ORM, Passport (JWT/ES256), Supabase (PostgreSQL, Storage)
- **AI Server**: Python, FastAPI, OpenAI/OpenRouter API, Pydantic
- **Infra/Database**: Supabase (PostgreSQL, Auth, Storage)

## 📂 Project Structure
```text
sally-ai-coach/
├── apps/
│   ├── frontend/     # Next.js 클라이언트 애플리케이션 (사용자/관리자 인터페이스)
│   ├── backend/      # NestJS 메인 API 서버 (비즈니스 로직, DB 제어)
│   └── ai_server/    # FastAPI AI 서버 (LLM 연동 및 AI 코칭 로직 전담)
├── package.json      # 워크스페이스 의존성 및 통합 스크립트 관리 (Node.js)
└── pnpm-workspace.yaml
```

## 🚀 Getting Started

### 1. 필수 준비물 (Prerequisites)
- Node.js (v18 이상 권장)
- pnpm (`npm install -g pnpm`)
- Python 3.9+ (AI 서버 구동용)

### 2. 의존성 설치 (Installation)
```bash
# Node.js 패키지 설치 (루트 폴더에서 실행)
pnpm install

# Python 패키지 설치
cd apps/ai_server
python -m venv .venv
# 가상환경 활성화 (Windows: .venv\Scripts\activate / Mac: source .venv/bin/activate)
pip install -r requirements.txt
```

### 3. 환경 변수 설정 (Environment Variables)
각 서비스 폴더에 `.env` 파일을 설정해야 합니다.

**Frontend (`apps/frontend/.env.local`)**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키

**Backend (`apps/backend/.env`)**
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `SERVICE_ROLE_KEY`: Supabase 서비스 롤 키 (백엔드 전용)
- `DATABASE_URL`: PostgreSQL 연결 주소

**AI Server (`apps/ai_server/.env`)**
- `OPENROUTER_API_KEY`: OpenRouter API 키 (또는 OpenAI 등 사용할 LLM의 API 키)

### 4. 서버 실행 (Development)
```bash
# 프론트엔드와 백엔드 동시 실행 (루트 폴더)
pnpm run dev

# AI 서버 실행 (apps/ai_server 폴더 내에서 가상환경 활성화 후 실행)
uvicorn main:app --reload --port 8000
```

## 🛠️ Key Features (Current Implementation)

### 🔐 Authentication & Security
- **JWT & RBAC**: Supabase Auth와 연동된 JWT 검증 시스템 구축. `@Roles` 데코레이터를 이용한 역할 기반 접근 제어(TEACHER, STUDENT, ADMIN) 구현을 통해 API 접근 완벽 통제

### 🏫 Class Management
- **Teacher/Student 분리**: 선생님용 클래스 관리(생성/수정/초대코드 재발급) 및 학생용 수강 정보(Takes) 조회 API 분리 구현
- **Prisma 최적화**: 모노레포에서의 경로 충돌 방지를 위해 `.prisma/client` 로컬 경로 및 `@prisma/adapter-pg` 도입

### 🧠 AI & Storage System
- **AI Proxy Server**: FastAPI 기반의 독립된 AI 서버(`ai_server`)를 구성하여 유연하고 확장성 높은 LLM 연동 아키텍처 마련
- **Supabase Storage**: 전역(Global) `StorageService`를 구현하여 파일 업로드(UUID명 중복 방지), 삭제 및 Public URL 반환 등 에셋 관리 기반 기능 제공