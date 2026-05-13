# Sally Frontend — Agent Rules

## Next.js

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Design System

**Read `design_system.md` before writing any UI code.** It is the authoritative source for colors, typography, spacing, border radius, and component specs.

### Color Tokens (CSS variables in `globals.css`)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | #E8593C | CTA 버튼, 강조 (NOT teal) |
| `--color-bg` | #F5F4F0 | 페이지 배경 |
| `--color-surface` | #FFFFFF | 카드, 모달 |
| `--color-text-primary` | #262B29 | 기본 텍스트 |
| `--color-text-secondary` | #797C7C | 보조 텍스트 |
| `--color-live` | #22CB84 | 진행중 상태 전용 (버튼에 사용 금지) |
| `--color-border` | #E5EAE8 | 기본 테두리 |

### Typography Tokens (CSS variables in `globals.css`)
| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-display` | 32px | 통계 수치 |
| `--font-size-2xl` | 22px | 모달/섹션 제목 |
| `--font-size-xl` | 18px | 카드 제목 |
| `--font-size-lg` | 16px | 레이블, 소제목 |
| `--font-size-md` | 14px | 기본 본문 |
| `--font-size-sm` | 12px | 보조 텍스트, 배지 |
| `--font-weight-bold` | 700 | 제목 |
| `--font-weight-semibold` | 600 | 레이블, 강조 |
| `--font-weight-regular` | 400 | 본문 |

**규칙:** CSS Module에서 `font-size: 14px` 같은 하드코딩 금지. 반드시 `var(--font-size-md)` 형태로 사용.

### Spacing (8pt Grid)
`4, 8, 12, 16, 20, 24, 32, 40, 48px`

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-badge` | 4px | 배지 |
| `--radius-button` | 8px | 버튼, 인풋 |
| `--radius-card` | 12px | 카드 |
| `--radius-modal` | 16px | 모달 |
