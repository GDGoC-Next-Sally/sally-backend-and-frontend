# 🎨 Sally AI Coach Frontend

Sally AI Coach의 사용자 인터페이스를 담당하는 Next.js 애플리케이션입니다.

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS v4
- **Auth**: Supabase Auth

## 📁 Key Directories
- `src/app/(auth)`: 로그인 및 회원가입 페이지 (Route Group)
- `src/lib/supabase.ts`: Supabase 클라이언트 설정 및 인증 유틸리티

## ✅ Current Implementation
- **인증 UI**: 모던한 디자인의 로그인/회원가입 페이지 구현 완료
- **Supabase Auth 연동**: 
  - 회원가입 및 이메일 컨펌 흐름 연동
  - 이메일/비밀번호 기반 로그인 및 JWT 토큰 획득 기능 구현
- **백엔드 연동 테스트**: 획득한 토큰을 사용하여 백엔드 보안 API를 호출하는 기능 검증 완료

## 📅 Update Log

### [2026.04.28] 프론트엔드 UI/UX 개편 및 전체 페이지 흐름 구현
- **변경 사항 (기존 파일 화면 교체)**:
  - `src/app/page.tsx` (기존 화면 -> 대시보드 위젯으로 교체)
  - `src/app/layout.tsx` (네비게이션 탑바 추가)
  - `src/app/(auth)/login/page.tsx` (기존 로그인 -> 신규 탭형 로그인 폼으로 교체)
  - `.env.local` (로컬 환경 개발 테스트용 더미 Supabase URL 추가 - 깃허브에는 안 올라감)
- **신규 추가 내역 (UI 컴포넌트 및 라우팅 추가)**:
  - **라우팅(`src/app/`)**: 대시보드(`/`), 클래스 목록(`/classes`), 클래스 상세(`/classes/[id]`), 세션 준비(`/classes/[id]/sessions/[sessionId]`), 세션 활성화(`/classes/[id]/sessions/[sessionId]/active`)
  - **UI 컴포넌트(`src/components/`)**: `TopNav`, `LoginForm`, `Dashboard`, `ClassList`, `CreateClassModal`, `StudentSidebar`, `SessionGrid`, `SessionPrep`, `SessionCodeModal`, `SessionEndModal`, `ActiveSession`
- **특이사항 및 협업 가이드**:
  - CSS Module(`.module.css`)을 활용하여 기존 글로벌 스타일과 충돌을 완벽히 차단함.
  - **프로토타입 단계 (UI-Driven)**: 현재 화면들은 가짜 데이터(Mock Data)로 구성된 정적 UI 껍데기 상태임. 백엔드 개발자는 이 화면들을 보며 어떤 API 데이터 구조가 필요한지 쉽게 파악하고 로직을 연동(상태 관리)할 수 있음
