# Sally 개발 참여 가이드

이 문서는 **Sally: AI 코치** 개발에 참여하는 팀원을 위한 작업 가이드입니다.
설계/IA/일정 등 **기획 문서**는 별도 [`sally-blueprint`](https://github.com/GDGoC-Next-Sally/sally-blueprint) 레포에 있습니다.

---

## 1. 팀 구성

| 역할 | GitHub | 담당 영역 |
|------|--------|-----------|
| **PM** | [@aground5](https://github.com/aground5) | 일정 관리 · 이슈 디스패치 · 통합 조율 |
| **Frontend** | [@euichanlee0608-svg](https://github.com/euichanlee0608-svg) | `apps/frontend` (Next.js · UI · 상태/소켓) |
| **Backend** | [@haimin13](https://github.com/haimin13) | `apps/backend` (NestJS · Prisma · Socket Gateway · Redis Publisher) |
| **AI** | [@delaykimm](https://github.com/delaykimm) | `apps/ai_server` (FastAPI · OpenRouter API · Redis Subscriber) |

---

## 2. 작업 일정

**기간**: `2026-04-30 ~ 2026-05-14` (15일)

상세 Gantt 차트: [`sally-blueprint/schedule/implement.mermaid`](https://github.com/GDGoC-Next-Sally/sally-blueprint/blob/main/schedule/implement.mermaid)

### Sprint 구조 (회의 주기 기준)

| Sprint | 기간 | 회의일 | 주요 산출물 | Milestone |
|--------|------|--------|-------------|-----------|
| **Sprint 1** | 4/30~5/1 | 5/1 | Auth FE · AI 서버 기반(Redis Pub/Sub) | [#1](https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend/milestone/1) |
| **Sprint 2** | 5/2~5/4 | 5/4 | T0 · S0 · T1 · S1 · AI Chat Service | [#2](https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend/milestone/2) |
| **Sprint 3** | 5/5~5/8 | 5/8 | T2 · BE Live Chat · AI Realtime Analysis | [#3](https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend/milestone/3) |
| **Sprint 4** | 5/9~5/11 | 5/11 | T3 · S2 · AI Report Service | [#4](https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend/milestone/4) |
| **Sprint 5** | 5/12~5/15 | 5/15 | T4 · S3 · BE Reports · QA | [#5](https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend/milestone/5) |

### 트랙별 의존성

```
AI 트랙 (delaykimm)  ─┬─ AI 기반 ─→ Chat ─→ Realtime ─→ Report
                     │
BE 트랙 (haimin13)   ─┼─ Class ─→ Session ─→ Live Chat (AI Chat 후) ─→ Reports (AI Report 후)
                     │
FE 트랙 (euichanlee) ─┴─ Auth ─→ T0/S0 ─→ T1/S1 ─→ T2 ─→ T3/S2 ─→ T4/S3
```

> 🔗 **AI ↔ Main 동기화 지점**
> - AI Chat 완료 시 → BE Live Chat Service 시작 가능
> - AI Report 완료 시 → BE Reports Service 시작 가능

---

## 3. 프로젝트 구조

### 모노레포 (pnpm workspace)

```
sally-backend-and-frontend/
├── apps/
│   ├── frontend/           # Next.js 16 (App Router)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/         # 로그인/회원가입 라우트 그룹
│   │       │   ├── t/home/         # 교사 홈 (T0)
│   │       │   ├── s/home/         # 학생 홈 (S0)
│   │       │   └── classes/        # 클래스 관련 페이지 (T1, T2)
│   │       ├── components/
│   │       │   ├── auth/           # 인증 컴포넌트
│   │       │   ├── classes/        # T1, T2 관련
│   │       │   ├── dashboard/      # T0, S0 위젯
│   │       │   ├── sessions/       # T3, S2 관련
│   │       │   ├── students/       # T4.2, S2 관련
│   │       │   ├── layout/
│   │       │   └── icons/
│   │       ├── lib/                # API 유틸 (api.ts)
│   ├── backend/            # NestJS 11
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # Passport JWT (ES256/JWKS)
│   │   │   │   └── classes/        # 클래스 CRUD (T1)
│   │   │   └── providers/
│   │   │       └── supabase/       # Supabase 클라이언트
│   │   └── prisma/
│   │       └── schema.prisma       # Supabase 테이블 동기화 완료
│   └── ai_server/          # FastAPI (Python 3.11)
│       ├── main.py
│       ├── models.py
│       ├── routers/
│       ├── services/
│       ├── requirements.txt
│       └── .env.example            # OPENROUTER_API_KEY
│
├── packages/               # 공유 패키지 (필요 시)
├── docker-compose.yml      # Redis 로컬 컨테이너
├── pnpm-workspace.yaml
└── package.json
```

### 디렉토리 명명 규칙 (FE)

IA 모듈 ID와 디렉토리를 1:1 매핑하지 않습니다. 의미 단위(`classes`, `sessions`, `dashboard`)로 그룹핑되어 있으니, 새 컴포넌트 추가 시 기존 폴더 구조를 따라주세요.

---

## 4. 기술 스택

### Frontend (`apps/frontend`)
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | `16.2.4` (App Router) | 프레임워크 |
| React | `19.2.4` | UI |
| Tailwind CSS | `^4` | 스타일링 |
| Supabase JS | `^2.105.0` | 인증 클라이언트 |
| TypeScript | `^5` | 언어 |
| ESLint | `^9` | 린트 |

> 📦 **추가 설치 예정**
> - **Socket.io-client** — 실시간 통신 (`pnpm --filter frontend add socket.io-client`)

### Backend (`apps/backend`)
| 기술 | 버전 | 용도 |
|------|------|------|
| NestJS | `^11.0.1` | 프레임워크 |
| Prisma | `^7.8.0` + `@prisma/adapter-pg` | ORM (pg 어댑터로 호이스팅 오류 해결) |
| Passport | `^0.7.0` + `passport-jwt` | 인증 |
| `jwks-rsa` | `^4.0.1` | Supabase JWT 검증 (ES256) |
| Supabase JS | `^2.105.0` | Auth/DB/Storage |
| `@nestjs/swagger` | `^11.4.2` | API 문서 (Swagger UI) |
| Jest | `^30` | 테스트 |

> 📦 **추가 설치 예정**
> - **Socket.io** — `@nestjs/websockets`, `@nestjs/platform-socket.io`
> - **Redis 클라이언트** — `ioredis` 또는 `@nestjs-modules/ioredis`

### AI Server (`apps/ai_server`)
| 기술 | 버전 | 용도 |
|------|------|------|
| Python | `3.11` | 언어 |
| FastAPI | 최신 | 웹 프레임워크 |
| Uvicorn | 최신 | ASGI 서버 |
| OpenRouter API | — | LLM 호출 (`OPENROUTER_API_KEY`) |
| python-dotenv | 최신 | 환경 변수 관리 |

> 📦 **추가 예정**
> - **Redis 클라이언트** — `redis-py` (Pub/Sub 연동)

환경 변수: `apps/ai_server/.env` 생성 후 `OPENROUTER_API_KEY` 입력

```bash
# AI 서버 실행
cd apps/ai_server
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Infra
- **Supabase**: PostgreSQL · Auth · Storage
- **Redis**: AI Task Queue (`docker-compose up -d`)
- 로컬 Redis 포트: `6379`

---

## 5. 시작하기

### 5.1 사전 준비
- Node.js v18+
- pnpm `npm install -g pnpm` (권장 버전: `pnpm@10.33.2`)
- Docker Desktop (Redis용)

### 5.2 설치 및 실행

```bash
# 1. 의존성 설치 (루트에서)
pnpm install

# 2. Redis 컨테이너 실행
pnpm docker
# (= docker-compose up -d)

# 3. 환경 변수 설정 (각자 .env 파일 생성)
#    apps/backend/.env
#    apps/frontend/.env.local
#    상세 항목은 README.md 참고

# 4. Prisma Client 생성
cd apps/backend
pnpm prisma generate

# 5. 전체 dev 서버 동시 실행 (FE + BE)
pnpm dev
```

### 5.3 개별 실행
```bash
pnpm --filter frontend dev   # FE만
pnpm --filter backend dev    # BE만

# AI 서버 (별도 터미널)
cd apps/ai_server
source .venv/bin/activate
uvicorn main:app --reload
```

---

## 6. GitHub Project 운영

### 6.1 링크
- **Project Board**: https://github.com/orgs/GDGoC-Next-Sally/projects/1
- **Milestones**: https://github.com/GDGoC-Next-Sally/sally-backend-and-frontend/milestones
- 권장 뷰: **Roadmap** (날짜) / **Board** (Status별 칸반)

### 6.2 필드 구성

| 필드 | 용도 |
|------|------|
| **Status** | `Todo` → `In progress` → `Done` (지연 시 `Delayed`) |
| **Assignees** | 담당자 |
| **Labels** | `FE` · `BE` · `AI` |
| **Milestone** | Sprint 1~5 |
| **Iteration** | Sprint 1~5 (Project 내부 필드, Milestone과 동일 의미) |
| **Start date / Target date** | 작업 시작/종료 예정일 |

### 6.3 Status 운영 규칙

| 상태 | 전환 시점 |
|------|-----------|
| **Todo** | 이슈 생성 직후 (기본) |
| **In progress** | 작업 시작 시 본인이 직접 변경 |
| **Done** | PR이 main에 머지되면 본인이 변경 |
| **Delayed** | Target date 지났는데 In progress 인 경우 PM이 변경 |

> ⚠️ Status는 자동 변경되지 않습니다. 수동으로 옮겨주세요.

### 6.4 새 이슈 추가 시
1. 이슈 생성 (제목: `[모듈ID] 작업명`)
2. Label 부착 (`FE` / `BE` / `AI`)
3. Assignee 지정
4. Milestone 지정 (해당 Sprint)
5. Project 추가 → Iteration / Start date / Target date 입력

---

## 7. 이슈 작성 컨벤션

### 7.1 제목 형식

```
[모듈ID] 작업 요약
```

- 모듈 ID는 [`sally-blueprint/ia/global.mermaid`](https://github.com/GDGoC-Next-Sally/sally-blueprint/blob/main/ia/global.mermaid) 참고
- 예: `[T1.1] 신규 클래스 생성`, `[S2.4] 세션 종료 이벤트 수신`, `[AI] Chat Service 스트리밍 구현`

### 7.2 본문 템플릿

```markdown
## 작업 범위
- 구체적인 작업 항목 (체크박스 권장)

## 의존성
- 선행되어야 할 다른 이슈/작업

## 참고
- 관련 IA 노드, 다이어그램 위치 등

## 일정
`YYYY-MM-DD ~ YYYY-MM-DD`
```

---

## 8. Git 워크플로우

### 8.1 브랜치 전략

```
main            ← 항상 동작하는 안정 버전
├─ feat/<scope>/<short-desc>    예) feat/t1/class-creation
├─ fix/<scope>/<short-desc>     예) fix/s2/socket-disconnect
├─ refactor/<scope>/<desc>      예) refactor/be/auth-guard
└─ docs/<short-desc>            예) docs/contribute-guide
```

- `<scope>`: IA 모듈 ID (`t1`, `s2`, `ai`) 또는 영역 (`be`, `fe`, `infra`)
- 한 브랜치 = 한 이슈
- 머지 후 브랜치 삭제

### 8.2 커밋 컨벤션 (Conventional Commits)

```
<type>: <subject>

[선택] 본문
```

| type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변경 없는 구조 개선 |
| `docs` | 문서만 변경 |
| `style` | 포맷·세미콜론 등 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정/기타 |

예시:
```
feat: T1.1 신규 클래스 생성 폼 구현
fix: S2 소켓 재연결 시 메시지 중복 수신 해결
refactor: backend auth guard 로직 분리
```

### 8.3 PR 컨벤션

- **제목**: 커밋 컨벤션과 동일
- **본문 템플릿**:
  ```markdown
  ## 변경 사항
  - 핵심 변경 요약

  ## 관련 이슈
  Closes #이슈번호

  ## 테스트
  - [ ] 로컬 동작 확인
  - [ ] 관련 시나리오 테스트
  ```
- **리뷰어**: 같은 트랙 담당자 1명 + 큰 변경이면 PM
- **머지 방식**: Squash merge 권장

---

## 9. IA 번호 체계

상세는 [`sally-blueprint/ia/global.mermaid`](https://github.com/GDGoC-Next-Sally/sally-blueprint/blob/main/ia/global.mermaid).

### 교사 (T)
| ID | 영역 |
|----|------|
| `T0` | 교사 홈 대시보드 (`/t/home`) |
| `T1` | 클래스 관리 (생성·목록·수정·코드 발급) |
| `T2` | 클래스 상세 · 세션 기획 |
| `T3` | 실시간 세션 대시보드 |
| `T4` | 분석 리포트 (그룹/개별/통합) |

### 학생 (S)
| ID | 영역 |
|----|------|
| `S0` | 학생 홈 대시보드 (`/s/home`) |
| `S1` | 클래스 상세 및 대기실 |
| `S2` | AI 실시간 채팅 코칭 |
| `S3` | 세션 복기 뷰어 |

서브 노드는 점 표기(`T2.2.A`)로 세분화.

---

## 10. 일일 진행 절차

1. **작업 시작**: Project에서 본인 이슈를 `In progress`로 이동
2. **작업 중**: 의존성/블로커 발생 시 PM에게 즉시 공유
3. **PR 생성**: 같은 트랙 담당자에게 리뷰 요청 → 머지 → 이슈 close → Status `Done`
4. **회의일** (5/1, 5/4, 5/8, 5/11, 5/15): Sprint 회고 + 다음 Sprint 플랜

---

## 11. 도움이 필요할 때

- 일정·이슈 디스패치 → **PM (@aground5)**
- 트랙 간 인터페이스 (REST API 스펙, Socket 이벤트 명세, Redis 채널 메시지 포맷 등) → 슬랙/회의에서 합의 후 이슈 본문에 명시
- 설계 변경이 필요하면 → [sally-blueprint](https://github.com/GDGoC-Next-Sally/sally-blueprint) 레포에 PR

> 즐거운 해커톤 되세요! 🚀
