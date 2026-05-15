# 🤖 Sally AI Coach

AI를 활용한 실시간 코칭 및 학습 관리 플랫폼, **Sally AI Coach**의 전체 소스코드입니다.  
본 프로젝트는 학생의 대화를 실시간으로 분석하여 선생님에게 통찰을 제공하고, 수업 종료 시 자동으로 개별 학습 리포트를 생성합니다.

---

## 🏗️ Architecture & Tech Stack

본 프로젝트는 효율적인 코드 관리와 공유를 위해 **pnpm workspace 기반의 모노레포** 구조로 설계되었습니다.
(프론트엔드와 백엔드는 Node.js 생태계를 공유하며, AI 서버는 Python FastAPI로 독립적으로 동작합니다.)

### 💻 Technology Stack
- **Frontend**: Next.js (App Router), Tailwind CSS v4, Supabase Auth
- **Backend (API)**: NestJS, Prisma ORM, Socket.io (실시간 알림), SSE (AI 답변 스트리밍), Supabase (PostgreSQL, Storage)
- **AI Server**: Python FastAPI, NVIDIA NIM API (Gemma-4-31B), Supabase SDK, Pydantic
- **Infra/Database**: Supabase (PostgreSQL, Auth, Storage)

### 📂 Project Structure    
```text
sally-ai-coach/
├── apps/
│   ├── frontend/     # Next.js 클라이언트 애플리케이션
│   ├── backend/      # NestJS 메인 API 서버
│   └── ai_server/    # FastAPI AI 서버 (LLM 코칭 로직 전담)
├── run-ai-server.ps1 # AI 서버 자동 환경 구축 및 실행 스크립트 (Windows)
├── package.json      # 워크스페이스 의존성 및 통합 스크립트 관리
└── pnpm-workspace.yaml
```

---

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

### 3. 서버 실행 (Development)

**Step 1: Frontend & Backend 실행**
```bash
# 루트 폴더에서 실행
pnpm run dev
```

**Step 2: AI 서버 실행**
- **Windows**: 아래 명령어를 실행하면 자동으로 가상환경을 설정하고 실행해줍니다.
  ```powershell
  .\run-ai-server.ps1
  ```
- **Mac/Linux**: `apps/ai_server` 폴더에서 가상환경 활성화 후 아래 명령어를 실행하세요.
  ```bash
  uvicorn main:app --reload --port 8000
  ```

---

### 4. 환경 변수 설정 (Environment Variables)

각 서비스 폴더에 `.env` 파일을 설정해야 합니다. (각 폴더의 `.env.example` 참고)

#### **Frontend (`apps/frontend/.env.local`)**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""

# Backend API
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
```

#### **Backend (`apps/backend/.env`)**
```env
# Supabase
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Database
DATABASE_URL=""

# AI Server
AI_SERVER_URL="http://localhost:8000"

# Security
INTERNAL_SECRET_KEY="" # AI 서버와 통신용 시크릿 키
```

#### **AI Server (`apps/ai_server/.env`)**
```env
# LLM API
OPENROUTER_API_KEY="" # OpenRouter API 키
NVIDIA_API_KEY=""      # NVIDIA NIM API 키
NVIDIA_MODEL="google/gemma-4-31b-it"

# Supabase 연결
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
DATABASE_URL=""

# Supabase Storage 버킷 이름
SUPABASE_REPORT_BUCKET="sally-storage"

# 백엔드 callback api 호출 헤더
INTERNAL_SECRET_KEY="" # 백엔드와 일치 필수
```

---

## 🛠️ Key Features (Current Implementation)

### 🔐 실시간 대화 분석 & 피드백
- **SSE Streaming**: 학생이 질문하면 AI 서버가 즉시 스트리밍 방식으로 답변을 생성합니다.
- **Real-time Monitoring**: AI 서버가 백그라운드에서 학생의 이해도를 분석하여 선생님 대시보드에 소켓 이벤트를 전송합니다.

### 📊 자동 학습 리포트
- **Auto Generation**: 수업 종료 시 해당 세션의 모든 대화 내역과 분석 데이터를 종합하여 AI가 최종 리포트를 생성합니다.
- **Report Dashboard**: 생성된 리포트를 학생용(본인 이력)과 선생님용(클래스 통계)으로 나뉘어 조회할 수 있습니다.

### 🛡️ 내부 보안 시스템
- **Internal Security**: 백엔드와 AI 서버 간의 통신은 `@Internal()` 데코레이터와 `INTERNAL_SECRET_KEY`를 통해 검증됩니다.