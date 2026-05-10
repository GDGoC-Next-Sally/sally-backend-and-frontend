# 🛠️ 개발자용 AI 채팅 테스트 환경 구축 계획 (Dev Chat UI)

## 1. 목표
프론트엔드 구동이나 복잡한 로그인, 클래스 세팅 과정 없이 **백엔드 서버만 켜진 상태에서 AI 채팅 스트리밍(SSE)과 실시간 선생님 모니터링(Socket.io)을 한눈에 테스트**할 수 있는 원클릭 개발자 도구를 구축합니다.

## 2. 화면 구성 (Split View)
브라우저에서 `http://localhost:3001/dev/ui` 에 접속하면 나타나는 단일 HTML 페이지입니다.

### 👈 왼쪽 화면: 학생 시점 (채팅 & SSE 스트리밍)
- **기능**: AI 코치와의 채팅
- **동작**:
  - 메시지 입력 후 전송 버튼 클릭
  - 백엔드의 실제 `POST /livechat/chat` 엔드포인트 호출
  - SSE(Server-Sent Events)를 통해 실시간으로 타이핑되는 AI의 답변 렌더링

### 👉 오른쪽 화면: 선생님 시점 (Socket.io 실시간 모니터링)
- **기능**: 학생의 상태를 실시간으로 관제
- **동작**:
  - 소켓 연결을 통해 수신되는 이벤트들을 실시간 로그 형태로 출력
  - 수신 대상 이벤트:
    - `student_message`: 학생이 메시지를 보냈을 때
    - `ai_message`: AI 답변이 완료되었을 때
    - `student_analysis_ready`: AI 서버에서 분석한 실시간 이해도, 감정, 오개념 등 JSON 데이터
    - `student_warning`: 이탈 위험, 좌절 등 긴급 상황 경고 알림

---

## 3. 백엔드 구현 스펙 (`DevModule`)

실제 운영 환경에 영향을 주지 않도록 개발 환경에서만 작동하는 전용 모듈을 생성합니다.

### API 1: 원클릭 데이터 세팅 및 토큰 발급 (`POST /dev/seed`)
- `@Public()`으로 인증 없이 접근 가능.
- **로직**:
  1. `users` 테이블에 더미 선생님(`dev_teacher`), 더미 학생(`dev_student`) 계정 `upsert`
  2. `classes`, `sessions`, `takes`(수강신청) 더미 데이터 `upsert`
  3. `dialogs`(대화방) 더미 데이터 `upsert`
  4. AuthService를 이용해 두 계정의 **실제 JWT 토큰** 발급
- **응답**:
  ```json
  {
    "dialogId": 1,
    "sessionId": 1,
    "studentToken": "eyJhb...",
    "teacherToken": "eyJhb..."
  }
  ```
- **장점**: 이 토큰을 사용하면 별도의 인증 우회 로직을 짤 필요 없이 **실제 프로덕션 API**를 그대로 테스트할 수 있습니다.

### API 2: 테스트 UI 제공 (`GET /dev/ui`)
- HTML 파일을 단순 문자열 형식으로 응답하거나, 정적 파일 서빙을 통해 브라우저에 화면을 제공합니다.

---

## 4. 프론트엔드 (초간단 HTML/JS) 작동 흐름
서빙된 HTML 파일 내부에 포함된 순수 Javascript로 작동합니다. (프레임워크 불필요)

1. **초기화**: 페이지 로드 시 즉시 `POST /dev/seed`를 호출하여 토큰과 ID들을 받아옵니다.
2. **선생님 소켓 연결**: 받아온 `teacherToken`을 사용하여 Socket.io 서버에 연결합니다. 이벤트 리스너를 등록해 오른쪽 화면에 로그를 찍습니다.
3. **학생 채팅 전송**: 사용자가 메시지를 입력하면 `studentToken`을 헤더에 넣고 `POST /livechat/chat` API를 호출합니다.
4. **SSE 렌더링**: Fetch API를 통해 SSE 스트림을 읽어와 왼쪽 화면의 말풍선에 실시간으로 글자를 이어 붙입니다.

---

## 5. 작업 순서 (TODO)
- [ ] `apps/backend/src/modules/dev` 디렉토리 및 `DevModule` 생성
- [ ] `DevController` 및 `DevService`에 `/dev/seed` (더미 데이터 + 토큰 발급) 로직 구현
- [ ] 단일 파일로 구성된 `dev-chat.html` 작성 (UI 및 JS 로직 포함)
- [ ] `GET /dev/ui` 엔드포인트에서 해당 HTML 서빙 연결
- [ ] 구동 및 양방향 실시간 통신(SSE + Socket) 통합 테스트
