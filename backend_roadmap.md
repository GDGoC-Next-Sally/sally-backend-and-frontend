# 🚀 Sally AI Coach - Backend Roadmap & Schedule

이 문서는 GitHub Issue를 기반으로 정리된 백엔드 개발 스케줄입니다.

## 🏁 Sprint 3: Infrastructure & Class Management (Current)
**기간:** 2026-05-04 ~ 2026-05-08

### [T1] 클래스 관리 (교사) [#5]
- [x] `T1.1.S` 8자리 Alpha-numeric 입장 코드 발급 로직 구현
- [x] `T1.4` 입장 코드 재생성 API 구현
- [ ] FE 연동 및 예외 처리 고도화

### [BE] Live Chat & Socket Gateway [#8]
- **기간:** 2026-05-06 ~ 2026-05-08 (AI Chat Service 완료 후 시작)
- [x] **Socket Gateway**: 클래스 룸 Join (자동 입장 및 서버 사이드 제어 완료)
- [ ] **Live Chat WebSocket 이벤트 처리**: 채팅 전송, 알림 처리 로직 구현 예정
- [ ] **Live Chat Service**: 채팅 전송, AI 직접 요청 Handler, 힌트 푸시 로직
- [ ] **SSE (Server-Sent Events)**: AI 스트리밍 응답을 클라이언트에 전달

---

## 🏔️ Sprint 5: Sessions & Analytics
**기간:** 2026-05-08 ~ 2026-05-14

### [T2] 세션 기획 및 클래스 상세 [#7]
- **기간:** 2026-05-08 ~ 2026-05-13
- [ ] **Session Service**: 세션 CRUD 및 상태 관리 (Planning → Active → Done)
- [ ] **Attendance**: 학생 출석 체크 로직
- [ ] **Template**: 수업 템플릿 관리 기능

### [BE] Reports Service [#9]
- **기간:** 2026-05-14 (AI Report Service 완료 후 시작)
- [ ] **Reports Managing**: 리포트 CRUD 및 결과 데이터 처리
- [ ] **Storage Integration**: 분석 결과 파일(Storage) 링크 관리
- [ ] **Polling**: AI 분석 완료 여부 확인 API

---

## 🧪 Final Integration & QA
**기간:** 2026-05-14

### 통합 E2E 테스트 [#18]
- [ ] 교사-학생-AI 전 과정 통합 테스트 지원
- [ ] 대량 채팅 부하 테스트 및 안정성 점검

---

## 📝 비고 (Dependencies)
1. **Live Chat**: `AI Chat Service`가 선행되어야 함.
2. **Reports**: `AI Report Service` 및 `Storage` 연동이 선행되어야 함. (현재 StorageService는 기반 마련 완료)
3. **Prisma**: 새로운 모델(Sessions, Reports 등) 추가 시 `npx prisma generate` 필수.
