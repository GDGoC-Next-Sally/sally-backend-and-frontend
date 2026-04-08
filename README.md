# Sally AI Coach 🤖

Sally AI Coach는 AI 기반의 코칭 서비스를 제공하는 프로젝트입니다. 이 저장소는 프런트엔드와 백엔드가 함께 관리되는 모노레포 구조입니다.

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: PostCSS, Tailwind CSS
- **Language**: TypeScript
- **Port**: `3001`

### Backend
- **Framework**: NestJS 11
- **ORM**: Prisma
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io / ioredis
- **Language**: TypeScript
- **Port**: `3000`

---

## 📂 프로젝트 구조 (Project Structure)

```text
sally-ai-coach/
├── frontend/          # Next.js 기반 웹 애플리케이션 (Port: 3001)
└── backend/           # NestJS 기반 API 서버 (Port: 3000)
```

---

## 🚀 시작하기 (Getting Started)

### 1. 레포지토리 클론
```bash
git clone https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend.git
cd sally-ai-coach
```

### 2. Backend 실행 방법
```bash
cd backend
npm install
# .env 파일 설정 후
npx prisma generate
npm run start:dev
```
- API 서버는 `http://localhost:3000`에서 실행됩니다.

### 3. Frontend 실행 방법
```bash
cd frontend
npm install
npm run dev
```
- 웹 애플리케이션은 `http://localhost:3001`에서 실행됩니다.

---

## 🗄 데이터베이스 설정 (Prisma)
이 프로젝트는 Prisma를 사용하여 DB 스키마를 관리합니다. 변경 사항이 있을 경우 아래 명령어를 사용하세요.

- **스키마 변경 후 클라이언트 생성**: `npx prisma generate`
- **DB 스튜디오 열기**: `npx prisma studio`

---

## 📝 라이선스
This project is licensed under the MIT License.
