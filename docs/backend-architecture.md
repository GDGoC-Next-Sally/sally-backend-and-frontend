# Sally AI Coach — 백엔드 아키텍처 & API 레퍼런스

> 마지막 업데이트: 2026-05-06  
> NestJS 백엔드 + FastAPI AI 서버 + Supabase(PostgreSQL) + Socket.io 기반 실시간 AI 코칭 플랫폼

---

## 1. 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                         │
│                    포트: 3000 (프론트엔드)                        │
│  - REST API 호출 (HTTP)                                          │
│  - SSE 연결 (AI 답변 실시간 스트리밍)                              │
│  - Socket.io 연결 (실시간 이벤트 수신)                             │
└──────────────┬────────────────────────────────────┬────────────┘
               │ HTTP / SSE                         │ WebSocket
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NestJS 백엔드 (포트: 3001)                      │
│                                                                 │
│  REST Controllers ──► Services ──► Prisma ORM                  │
│                          │                                      │
│                    EventsGateway (Socket.io)                    │
│                    - userSocketMap (userId ↔ socket)            │
│                    - Room 기반 브로드캐스트                        │
└──────────────┬───────────────────────────────────┬─────────────┘
               │ HTTP (axios)                      │ Prisma (TCP)
               ▼                                   ▼
┌──────────────────────────┐         ┌─────────────────────────────┐
│   FastAPI AI 서버         │         │   Supabase (PostgreSQL)     │
│   (포트: 8000)            │         │                             │
│                          │         │  - users                    │
│  POST /api/chat          │         │  - classes                  │
│  POST /api/analyze       │         │  - sessions                 │
│  POST /api/end-session   │         │  - dialogs                  │
│  POST /api/update-       │         │  - chat_messages            │
│       realtime           │         │  - student_reports          │
│                          │         │  - session_reports          │
│  LLM: Google Gemma 4     │         │  - takes (수강신청)          │
│  (NVIDIA API)            │         │  - attends (출석)            │
└──────────────────────────┘         └─────────────────────────────┘
```

---

## 2. NestJS 백엔드 모듈 구조

```
src/
├── app.module.ts                 # 루트 모듈
├── main.ts                       # 서버 진입점 (포트: 3001)
├── common/
│   └── gateways/
│       ├── events.gateway.ts     # Socket.io 게이트웨이 (핵심)
│       └── gateways.module.ts
├── providers/
│   ├── prisma/                   # Prisma ORM 클라이언트
│   └── supabase/                 # Supabase 클라이언트 (소켓 인증용)
└── modules/
    ├── auth/                     # JWT 인증, RolesGuard
    ├── classes/                  # 클래스(반) 관리
    ├── sessions/                 # 수업 세션 관리
    ├── livechat/                 # 실시간 채팅 (핵심)
    ├── reports/                  # 세션 종료 리포트
    └── monitoring/               # 모니터링 (미구현)
```

---

## 3. 인증 & 권한

### 인증 방식
- **Supabase Auth** 기반 JWT 토큰
- 모든 API에 `@UseGuards(JwtAuthGuard, RolesGuard)` 적용
- 요청 헤더: `Authorization: Bearer <supabase_access_token>`

### 역할(Role) 종류
| Role | 설명 |
|---|---|
| `STUDENT` | 학생. 수업 참여, 채팅 가능 |
| `TEACHER` | 선생님. 수업 개설, 모니터링, 개입 가능 |
| `ADMIN` | 관리자 (현재 미사용) |

### JWT Strategy (`jwt.strategy.ts`)
Supabase의 `auth.getUser(token)` API로 토큰을 검증하고,  
`users` 테이블에서 `role`을 가져와 `req.user`에 주입합니다.
```typescript
req.user = { userId: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN' }
```

---

## 4. WebSocket (Socket.io) 아키텍처

### 연결 방식
클라이언트는 소켓 연결 시 반드시 토큰을 전달해야 합니다:
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: supabase_access_token }
});
```

### `EventsGateway` 핵심 메커니즘

**`userSocketMap: Map<userId, Socket>`**  
- 유저가 접속하면 `userId ↔ socket` 매핑을 Map에 저장
- 이를 통해 특정 유저에게 1:1 이벤트 전송 가능

**Room 구조**  
접속 시 자동으로 본인이 속한 모든 클래스 룸에 입장:
```
class:{classId}    ← 클래스 단위 브로드캐스트
session:{sessionId} ← 세션 단위 브로드캐스트 (수업 시작 후 생성)
```

### 서버 → 클라이언트 이벤트 목록

| 이벤트명 | 발신 대상 | 발생 시점 | payload |
|---|---|---|---|
| `session_created` | 해당 세션 Room | 선생님이 세션 생성 | session 객체 |
| `session_started` | 해당 세션 Room | 선생님이 수업 시작 | session 객체 |
| `session_finished` | 해당 세션 Room | 선생님이 수업 종료 | session 객체 |
| `student_message` | 선생님 (1:1) | 학생이 채팅 전송 | chat_message 객체 |
| `ai_message` | 선생님 (1:1) | AI 답변 완료 | chat_message 객체 |
| `teacher_intervention` | 학생 (1:1) | 선생님이 개입 전송 | message + type |
| `student_analysis_ready` | 선생님 (1:1) | AI 분석 완료 | `{ dialog_id, analysis: TeacherSummary }` |

### 클라이언트 → 서버 이벤트 목록

| 이벤트명 | 설명 | payload |
|---|---|---|
| `join_room` | 특정 Room 수동 입장 | `{ room: string }` |
| `leave_room` | 특정 Room 탈퇴 | `{ room: string }` |
| `chat_message` | 테스트용 채팅 | `{ room: string, message: string }` |

---

## 5. API 엔드포인트

### 5-1. Classes (반 관리)
Base URL: `/classes`

| Method | Path | Role | 설명 |
|---|---|---|---|
| `POST` | `/` | TEACHER | 새 클래스 생성 |
| `GET` | `/teacher` | TEACHER | 내 클래스 목록 조회 |
| `GET` | `/student` | STUDENT | 수강 중인 클래스 목록 |
| `GET` | `/:id` | ALL | 클래스 상세 조회 |
| `PATCH` | `/:id` | TEACHER | 클래스 정보 수정 |
| `DELETE` | `/:id` | TEACHER | 클래스 삭제 |
| `PATCH` | `/:id/invite` | TEACHER | 초대코드 재발급 |
| `PATCH` | `/:id/registerable` | TEACHER | 초대 가능 여부 토글 |
| `POST` | `/student/join` | STUDENT | 초대코드로 클래스 입장 |
| `POST` | `/student/:id/leave` | STUDENT | 클래스 탈퇴 |
| `POST` | `/teacher/:id/kick` | TEACHER | 학생 강퇴 |
| `GET` | `/:id/students` | TEACHER | 클래스 내 학생 목록 |

---

### 5-2. Sessions (수업 세션 관리)
Base URL: `/sessions`

| Method | Path | Role | 설명 |
|---|---|---|---|
| `POST` | `/` | TEACHER | 새 세션 생성 |
| `GET` | `/class/:classId` | ALL | 클래스별 세션 목록 |
| `GET` | `/:id` | ALL | 세션 상세 조회 |
| `PATCH` | `/:id` | TEACHER | 세션 정보 수정 |
| `DELETE` | `/:id` | TEACHER | 세션 삭제 |
| `POST` | `/:id/start` | TEACHER | 수업 시작 → status: ACTIVE |
| `POST` | `/:id/finish` | TEACHER | 수업 종료 → status: FINISHED + 최종 리포트 요청 |
| `POST` | `/:id/join` | STUDENT | 학생 수업 참여 → dialog 생성 |

#### `POST /:id/join` 응답 예시
```json
{
  "dialog": {
    "id": 1,
    "session_id": 1,
    "student_id": "uuid...",
    "status": true,
    "real_time_analysis": null
  },
  "session_status": "ACTIVE"
}
```
> 프론트엔드는 `session_status`가 `ACTIVE`이면 바로 채팅방으로 이동

---

### 5-3. LiveChat (실시간 채팅)
Base URL: `/livechat`

| Method | Path | Role | 설명 |
|---|---|---|---|
| `GET` | `/dialog/:dialogId` | ALL | 대화 내역 조회 |
| `POST` | `/intervention` | TEACHER | 선생님 개입 메시지 전송 |
| `POST /SSE` | `/message` | STUDENT | 학생 메시지 전송 + AI 스트리밍 응답 |

#### `POST /intervention` Request Body
```typescript
{
  dialog_id: number;           // 개입할 학생의 dialog ID
  content: string;             // 개입 메시지 내용
  type: 'ADVICE' | 'AI_GUIDANCE';
  // ADVICE     → 학생에게 조언만 (소켓으로 전달, AI에 영향 없음)
  // AI_GUIDANCE → 다음 AI 응답의 topic_hints에 포함됨
}
```

#### `POST /message` (SSE) Request Body
```typescript
{
  dialog_id: number;
  content: string;
  intervention?: string;  // 프론트에서 AI_GUIDANCE 타입 개입 내용 첨부 (옵션)
}
```

#### `POST /message` SSE 응답 형식
```
id: 1
data: {"chunk": "안녕"}

id: 2
data: {"chunk": "하세요!"}

...
(연결 종료 = 스트리밍 완료)
```

---

## 6. 채팅 메시지 전송 전체 플로우

```
학생                     NestJS 백엔드                    AI 서버         선생님 대시보드
 │                            │                              │                  │
 │── POST /livechat/message ──►│                              │                  │
 │   { dialog_id, content }   │                              │                  │
 │                            │ 1. 학생 메시지 DB 저장          │                  │
 │                            │ 2. WebSocket emit ───────────────────────────────►│
 │                            │    'student_message'         │    (실시간 알림)   │
 │                            │                              │                  │
 │                            │ 3. DB에서 대화 내역 조회        │                  │
 │                            │    → conversation_history 구성│                  │
 │                            │    → student_profile 구성    │                  │
 │                            │    (TEACHER 메시지 → topic_hints)                │
 │                            │                              │                  │
 │◄─── SSE 스트림 시작 ─────────│── POST /api/chat ──────────►│                  │
 │                            │                              │                  │
 │◄── data: {"chunk":"안"} ───│◄── stream chunk ────────────│                  │
 │◄── data: {"chunk":"녕"} ───│◄── stream chunk ────────────│                  │
 │◄── data: {"chunk":"하"} ───│◄── stream chunk ────────────│                  │
 │          ...               │          ...                 │                  │
 │                            │                              │                  │
 │◄─── SSE 스트림 종료 ─────────│◄── stream end ──────────────│                  │
 │                            │                              │                  │
 │                            │ 4. AI 메시지 DB 저장           │                  │
 │                            │ 5. WebSocket emit ───────────────────────────────►│
 │                            │    'ai_message'              │  (완성된 답변)    │
 │                            │                              │                  │
 │                            │── POST /api/analyze ────────►│ (백그라운드)      │
 │                            │   [fire & forget]            │                  │
 │                            │                              │ LLM 분석 중...    │
 │                            │◄── TeacherSummary JSON ──────│                  │
 │                            │                              │                  │
 │                            │ 6. real_time_analysis 배열에  │                  │
 │                            │    분석 결과 push 저장         │                  │
 │                            │ 7. WebSocket emit ───────────────────────────────►│
 │                            │    'student_analysis_ready'  │  (분석 결과)      │
```

---

## 7. 세션 종료 시 최종 리포트 플로우

```
선생님                   NestJS 백엔드                    AI 서버
  │                          │                              │
  │── POST /sessions/:id/finish ──►│                         │
  │                          │ 1. status: FINISHED 업데이트   │
  │                          │ 2. 소켓: 'session_finished'   │
  │◄── 응답 즉시 반환 ──────────│                              │
  │                          │                              │
  │                          │ [비동기 fire & forget]         │
  │                          │ 3. dialogs 테이블에서           │
  │                          │    해당 세션 학생 전체 조회      │
  │                          │    (student_id + real_time_analysis 배열)
  │                          │                              │
  │                          │── POST /api/end-session ────►│ (학생별 병렬 요청)
  │                          │   { session_id,              │
  │                          │     student_id,              │
  │                          │     summaries: [...],        │ LLM 최종 리포트 생성
  │                          │     student_profile }        │
  │                          │                              │ student_reports 테이블
  │                          │                              │ 에 직접 저장
  │                          │◄── { status: "ok", report }──│
```

---

## 8. 데이터베이스 스키마 요약

### 주요 테이블

#### `users`
```
id          String  @id (UUID, Supabase Auth와 동일)
name        String
email       String  @unique
role        STUDENT | TEACHER | ADMIN
```

#### `classes` (반)
```
id           Int      @id
teacher_id   String   (users.id FK)
subject      String   (과목명)
grade        Int?
homeroom     String?  (학반)
invite_code  String   @unique
registerable Boolean  (초대 가능 여부)
status       PLANNING | ACTIVE | COMPLETED
```

#### `sessions` (수업 세션)
```
id              Int      @id
class_id        Int      (classes.id FK)
teacher_id      String   (users.id FK)
session_name    String
status          PLANNING | ACTIVE | FINISHED
objective       String?  (학습 목표)
session_prompt  String?  (AI 시스템 프롬프트)
explanation     String?  (수업 설명)
scheduled_date  DateTime? @db.Date
scheduled_start DateTime?
scheduled_end   DateTime?
started_at      DateTime?
finished_at     DateTime?
```

#### `dialogs` (학생별 대화방)
```
id                  Int      @id
session_id          Int      (sessions.id FK)
student_id          String   (users.id FK)
status              Boolean  @default(true)
real_time_analysis  Json?    ← TeacherSummary 객체 배열 누적 저장
is_analyzed         Boolean  @default(false)
@@unique([session_id, student_id])
```

#### `chat_messages` (채팅 메시지)
```
id           Int         @id
dialog_id    Int         (dialogs.id FK)
sender_type  STUDENT | AI | TEACHER
content      String
is_global    Boolean     @default(false)
created_at   DateTime
```

#### `student_reports` (학생 최종 리포트)
```
id         Int
student_id String
session_id Int
dialog_id  Int     @unique
content    Json?   ← AI 서버가 직접 저장하는 FinalReport
created_at DateTime
```

#### `takes` (수강 신청)
```
student_id String
class_id   Int
@@id([student_id, class_id])
```

#### `attends` (출석)
```
student_id String
session_id Int
@@id([student_id, session_id])
```

---

## 9. AI 서버 API 규격

Base URL: `http://localhost:8000` (환경변수: `AI_SERVER_URL`)

### `POST /api/chat` — AI 채팅 스트리밍
**Request:**
```json
{
  "conversation_history": [
    { "role": "user", "text": "안녕하세요" },
    { "role": "model", "text": "네, 반가워요!" }
  ],
  "student_profile": {
    "subject": "수학",
    "scope": "1단원: 이차방정식",
    "learning_objectives": "근의 공식을 이해한다",
    "key_concepts": "체험 위주 수업",
    "topic_hints": ["적분은 다루지 마세요", "기초부터 설명해주세요"],
    "forbidden_topics": "미설정",
    "misconception_tag_hints": []
  }
}
```
**Response:** `StreamingResponse` (text/event-stream)  
텍스트 청크가 실시간으로 스트리밍됨

> `topic_hints`: 선생님의 개입 메시지(TEACHER sender_type)가 시간순으로 담김

---

### `POST /api/analyze` — 학생 상태 분석
**Request:** `/api/chat`과 동일한 형식 (AI 답변까지 포함된 conversation_history)  
**Response:** `TeacherSummary` JSON
```json
{
  "frustration_delta": -5,
  "student_understood": true,
  "is_hallucination_risk": false,
  "understanding_score": 7,
  "current_topic": "이차방정식 근의 공식",
  "student_emotion": "집중",
  "internal_reasoning": "개념을 올바르게 적용하고 있음",
  "one_line_summary": "근의 공식 적용에 익숙해지는 중",
  "question_intent": "개념질문",
  "confusion_type": "없음",
  "misconception_tag": null,
  "learning_mode": "active"
}
```

---

### `POST /api/end-session` — 최종 리포트 생성
**Request:**
```json
{
  "session_id": 1,
  "student_id": "uuid...",
  "summaries": [ /* TeacherSummary 객체 배열 (전체 수업 누적) */ ],
  "student_profile": { /* 위와 동일 */ }
}
```
**Response:**
```json
{
  "status": "ok",
  "session_id": "1",
  "report": { /* FinalReport 객체 */ },
  "report_url": ""
}
```
> AI 서버가 내부적으로 `student_reports` 테이블에 직접 저장하고 `dialogs.is_analyzed = true`로 업데이트

---

## 10. 환경변수 (.env)

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
AI_SERVER_URL=http://localhost:8000   # AI 서버 주소 (기본값)
PORT=3001
```

---

## 11. 모듈 간 의존성

```
AppModule
├── ClassesModule
│   ├── PrismaModule
│   └── GatewaysModule
├── SessionsModule
│   ├── PrismaModule
│   ├── GatewaysModule
│   └── ReportsModule          ← 세션 종료 시 최종 리포트 요청
├── LivechatModule
│   ├── PrismaModule
│   └── GatewaysModule
├── ReportsModule              ← AI 서버 end-session 통신 담당
├── AuthModule
└── GatewaysModule             ← Socket.io, 전역 공유
```

---

## 12. 개발 시 참고사항

### 실시간 채팅 테스트 방법
1. AI 서버 실행: `uvicorn ai_server.main:app --reload --port 8000`
2. 백엔드 실행: `pnpm dev` (포트 3001)
3. `socket-test.html`을 브라우저로 열어 소켓 이벤트 수신 확인
4. 학생 토큰으로 curl 테스트:
```cmd
curl -N -X POST http://localhost:3001/livechat/message ^
     -H "Content-Type: application/json" ^
     -H "Authorization: Bearer <토큰>" ^
     -d "{\"dialog_id\": 1, \"content\": \"질문 내용\"}"
```

### 현재 구현 완료 항목
- [x] Classes CRUD + 초대코드 시스템
- [x] Sessions CRUD + 수업 시작/종료
- [x] 학생 수업 참여 (dialog 자동 생성)
- [x] 실시간 채팅 SSE 스트리밍 (AI 서버 연동)
- [x] 선생님 개입(Intervention) 시스템
- [x] 학생 실시간 분석 (`student_analysis_ready`)
- [x] 세션 종료 시 최종 리포트 생성 파이프라인
- [x] Socket.io 룸 기반 실시간 이벤트
- [x] `monitoring` 모듈 (선생님 대시보드용 현황 조회 API)
- [x] 세션 전체 공지 브로드캐스트 (`is_global` 활용)
- [x] 종료된 세션 메시지 발송 차단 (403 Forbidden)

### 미구현 / TODO
- [ ] 대화 내역 페이징(Pagination)
- [ ] `session_reports`, `class_reports` 조회 API
- [ ] Admin 기능 (사용자 관리, 전체 통계 등)
