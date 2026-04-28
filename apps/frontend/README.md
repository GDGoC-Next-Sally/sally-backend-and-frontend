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
