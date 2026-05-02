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
| Background/Page | #F5F4F0 | Page background (replaces #f8f9fa) |
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
| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| H1 · Page Title | 28px | Bold (700) | 1.3 | 페이지 제목 |
| H2 · Section Title | 22px | SemiBold (600) | 1.4 | 섹션 제목 |
| H3 · Card Title | 18px | SemiBold (600) | 1.4 | 카드 제목 |
| H4 · Subtitle | 16px | SemiBold (600) | 1.5 | 소제목 |
| Body · Default | 14px | Regular (400) | 1.6 | 본문 텍스트 |
| Caption · Label | 12px | Regular (400) | 1.5 | 보조 텍스트, 레이블 |
| Badge · Tag | 10px | SemiBold (600) | 1.4 | 배지, 태그 |

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
- Replace #f8f9fa with #F5F4F0 for page backgrounds
- Replace #212529, #343a40 with #1A1A1A for primary text
- Replace #495057, #868e96 with #6B6B6B for secondary text
- Replace #dee2e6, #e9ecef with #E0DED8 for borders
- Replace #f1f3f5 with #EBEBEA for subtle borders
- Modal border-radius must be 16px
- Card border-radius is 12px
