---
name: Sally Design System
description: Official design tokens, typography, spacing, border radius, and component specs from the design team. Apply to ALL frontend work.
type: project
originSessionId: 3b4a5895-6136-4bad-a72d-eb76e87faf24
---
## Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| Primary/Sally Orange | #E8593C | CTA buttons, active selections, focus borders, primary accent |
| Primary hover | #CF4E35 | Hover state of primary buttons |
| Primary light | #FDF0ED | Light bg for primary elements |
| Secondary/Lavender | #D4C9F0 | Secondary accents |
| Surface/White | #FFFFFF | Cards, modals, inputs |
| Background/Page | #F5F6F8 | Page background (`--color-bg`) |
| Text/Primary | #1A1A1A | Main text (replaces #212529, #343a40) |
| Text/Secondary | #6B6B6B | Secondary text (replaces #495057, #868e96) |
| Semantic/Live | #22C55E | 진행중 badge, active status dot, toggle ON |
| Semantic/Live light | #F0FBF4 | Light bg for live badges |
| Semantic/Planning | #F59E0B | 예정/임시예정 badge |
| Semantic/Planning light | #FFF8EC | Light bg for planning badges |
| Semantic/Done | #D0CEC8 | 종료 badge, completed status |
| Semantic/Done light | #F5F4F2 | Light bg for done badges |
| Border/Default | #E0DED8 | All borders (replaces #dee2e6, #e9ecef) |
| Border light | #EBEBEA | Subtle borders (replaces #f1f3f5) |

**Why:** Primary CTA is orange (#E8593C), NOT teal. Semantic/Live green (#22C55E) is ONLY for live/active status indicators, NOT for buttons.

## Typography Scale

폰트: **Pretendard Variable** (주, 본문 전체) / **Cafe24 Ssurround** (로고 전용)

### Size Primitives (CSS 변수)
| Token | Size | 사용처 |
|-------|------|--------|
| `--font-size-display` | 32px | Stat — 통계 숫자, 대형 수치 |
| `--font-size-h1` | 24px | H1 — 클래스명, 페이지/모달 제목 |
| `--font-size-h2` | 20px | H2 — 섹션 제목 |
| `--font-size-h3` | 16px | H3 — 카드 헤더 |
| `--font-size-body` | 14px | Body — 기본 본문 |
| `--font-size-caption` | 12px | Caption, Badge |
| `--font-size-caption-sm` | 10px | 소형 Caption (세부 설명 등) |

### Weight Primitives (CSS 변수)
| Token | Value | 용도 |
|-------|-------|------|
| `--font-weight-regular` | 400 | 거의 사용 안 함 (기본 weight는 Medium) |
| `--font-weight-medium` | 500 | Body, Caption 기본 |
| `--font-weight-semibold` | 600 | Body 중강조 |
| `--font-weight-bold` | 700 | 제목, 강조, Badge |
| `--font-weight-extrabold` | 800 | 카드 헤더(H3) 전용 |

### Font Family 변수
| Token | Value | 용도 |
|-------|-------|------|
| `--font-family-base` | Pretendard Variable | 본문 전체 |
| `--font-family-logo` | Cafe24Ssurround → Pretendard fallback | 로고 전용 |

### Semantic Roles (글로벌 CSS 클래스)
CSS Module에서 `composes: t-h1 from global;` 또는 className에 직접 추가하여 사용.

| Class | Size | Weight | Line-height | 사용처 (Figma 매핑) |
|-------|------|--------|-------------|---------------------|
| `.t-stat` | 32px | 700 | 1.2 | Stat — 통계 숫자, 대형 수치 (예: `78%`) |
| `.t-h1` | 24px | 700 | 1.3 | H1 — 클래스명, 페이지/모달 제목 (예: `3학년 2반`) |
| `.t-h2` | 20px | 700 | 1.4 | H2 — 섹션 제목 (예: `오늘의 클래스`) |
| `.t-h3` | 16px | **800** | 1.4 | H3 — 카드 헤더 (예: `공지사항`) |
| `.t-body-bold` | 14px | 700 | 1.6 | Body Bold — 강조 본문 (예: `클래스 평균 참여도`) |
| `.t-body-semibold` | 14px | 600 | 1.6 | Body SemiBold — 항목 제목 (예: `3월 학습 리포트 업데이트 안내`) |
| `.t-body` | 14px | **500** | 1.6 | Body Medium — 기본 본문 (예: `새로운 분석 항목이 추가되었어요.`) |
| `.t-caption` | 12px | 500 | 1.5 | Caption — 날짜, 메타 정보 (예: `2026.03.04`) |
| `.t-badge` | 12px | 700 | 1.4 | Badge — 상태 배지 (예: `관심필요`) |
| `.t-caption-sm` | 10px | 500 | 1.4 | 소형 Caption — 세부 설명 |
| `.t-logo` | (가변) | (가변) | (가변) | Cafe24 Ssurround font-family만 적용 |

### 사용 가이드
- **시맨틱 클래스 우선**: 의미가 명확한 곳(제목/본문/캡션/배지)은 `.t-*` 클래스 사용
- **CSS 변수 직접 사용**: 컨텍스트가 모호하거나 부분적 오버라이드 필요시 `var(--font-size-*)` 사용
- **본문 기본값**: `body`에 `font-weight: var(--font-weight-medium)` 적용됨 → 일반 텍스트는 별도 weight 지정 불필요

### 폐기 규칙 (마이그레이션)
- `font-size: 11px`, `10px` → `var(--font-size-caption-sm)` (10px) 또는 `--font-size-caption` (12px) — 컨텍스트 판단
- `font-size: 13px`, `15px` → `var(--font-size-body)` (14px)
- `font-size: 18px` → `var(--font-size-h3)` (16px) 또는 `--font-size-h2` (20px) — 컨텍스트 판단
- `font-size: 22px` → `var(--font-size-h1)` (24px) 또는 `--font-size-h2` (20px) — 컨텍스트 판단
- `font-size: 28px` → `var(--font-size-display)` (32px) 또는 `--font-size-h1` (24px) — 컨텍스트 판단
- rem 단위 → px 통일 (0.625rem→10px, 0.75rem→12px, 0.875rem→14px, 1rem→16px, 1.25rem→20px, 1.5rem→24px, 2rem→32px)

### 레거시 별칭 (호환용 — 신규 코드는 사용 금지)
| Legacy Token / Class | 매핑 | 비고 |
|----------------------|------|------|
| `--font-size-2xl` | `--font-size-h2` (20px) | 기존 22px → 20px로 정합 |
| `--font-size-xl` | `--font-size-h3` (16px) | 기존 18px → 16px로 정합 |
| `--font-size-lg` | `--font-size-h3` (16px) | 동일 |
| `--font-size-md` | `--font-size-body` (14px) | 동일 |
| `--font-size-sm` | `--font-size-caption` (12px) | 동일 |
| `.t-display` | `.t-stat` | 시맨틱 이름 변경 |
| `.t-section` | `.t-h1` | 시맨틱 이름 변경 (22→24px) |
| `.t-card` | `.t-h2` | 시맨틱 이름 변경 (18→20px, weight 600→700) |
| `.t-label` | `.t-h3` | 시맨틱 이름 변경 (weight 600→800) |
| `.t-body-strong` | `.t-body-bold` | 시맨틱 이름 변경 |
| `.t-caption-strong` | `.t-badge` | 시맨틱 이름 변경 (weight 600→700) |

## Spacing Scale (8pt Grid)
4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80px

## Border Radius
| Value | Usage |
|-------|-------|
| 4px | Badge, Tag |
| 8px | Button, Input |
| 12px | Card |
| 16px | Modal, Panel |
| 9999px | Pill, Avatar |

## Component Specs
| Component | Height | Padding H | Padding V | Radius | Background | Notes |
|-----------|--------|-----------|-----------|--------|------------|-------|
| Button/Primary | 40px | 24px | 12px | 8px | #E8593C | CTA 버튼 |
| Button/Secondary | 40px | 20px | 8px | 8px | #F5F4F0 | 일반 버튼 |
| Button/Small | 32px | 16px | 6px | 8px | #E8593C | 소형 버튼 |
| Input/Default | 40px | 12px | 10px | 8px | #FFFFFF | 기본 입력 필드 |
| Header | 56px | 24px | 0px | 0px | #FFFFFF | 상단 헤더 |
| Card | auto | 20px | 16px | 12px | #FFFFFF | 정보 카드 |
| Modal | auto | 24px | 24px | 16px | #FFFFFF | 모달 대화상자 |
| Badge/Status | 20px | 8px | 4px | 4px | #E8593C | 상태 배지 |

## How to apply
- Replace #20c997 (teal) with #E8593C for CTA buttons
- Replace #20c997 with #22C55E for live/active status indicators  
- Replace #f8f9fa, #F5F4F0 with `var(--color-bg)` (#F5F6F8) for page backgrounds
- Replace #212529, #343a40 with #1A1A1A for primary text
- Replace #495057, #868e96 with #6B6B6B for secondary text
- Replace #dee2e6, #e9ecef with #E0DED8 for borders
- Replace #f1f3f5 with #EBEBEA for subtle borders
- Modal border-radius must be 16px
- Card border-radius is 12px
