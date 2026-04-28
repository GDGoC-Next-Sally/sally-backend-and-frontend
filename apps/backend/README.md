# 🚀 Sally AI Coach Backend

Sally AI Coach의 핵심 비즈니스 로직과 데이터 처리를 담당하는 NestJS 서버입니다.

## 🛠️ Tech Stack
- **Framework**: NestJS
- **ORM**: Prisma
- **Auth**: Passport.js, jwks-rsa (Supabase JWT Verification)

## 📁 Key Directories
- `src/modules/auth`: JWT 검증 전략 및 가드 구현
- `src/providers/supabase`: Supabase SDK 연동 모듈
- `src/providers/prisma`: 데이터베이스 접근 모듈

## ✅ Current Implementation
- **JWKS 기반 JWT 검증**: Supabase의 ES256 비대칭키 방식을 사용한 토큰 검증 시스템 구축 완료
- **보안 API**: `JwtAuthGuard`를 이용한 요청 보호 체계 수립 (`/profile` 엔드포인트 테스트 완료)
- **Supabase SDK 연동**: 백엔드에서 Supabase 서비스를 직접 호출할 수 있는 기반 마련
