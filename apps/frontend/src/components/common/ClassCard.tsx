'use client';

import React from 'react';
import { Clock, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';
import styles from './ClassCard.module.css';

type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN' | 'FLEXIBLE';
interface ScheduleEntry { day: DayOfWeek; period?: number }

const DAY_KO: Record<string, string> = {
  MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일', FLEXIBLE: '유동',
};

function formatSchedule(schedule: ScheduleEntry[] | string | null | undefined): string | null {
  if (!schedule) return null;
  try {
    const entries: ScheduleEntry[] = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries
      .map((e) => (e.day === 'FLEXIBLE' ? '유동' : `${DAY_KO[e.day] ?? e.day}${e.period != null ? ` ${e.period}교시` : ''}`))
      .join(' · ');
  } catch {
    return typeof schedule === 'string' ? schedule : null;
  }
}

interface ClassCardProps {
  /** 카드 메인 타이틀 */
  title: string;
  /** 카드 서브타이틀 */
  subtitle?: string;
  /** 수업 시간표 — 있을 때만 표시 */
  schedule?: ScheduleEntry[] | string | null;
  /** 선택 여부 (교사 뷰) */
  isSelected?: boolean;
  /** 카드 클릭 핸들러 */
  onClick?: () => void;
  /** 대기실 이동 버튼 클릭 */
  onNavigate: () => void;
  /** 이동 버튼 레이블 @default "과목 대기실로 이동" */
  navigateLabel?: string;
  /**
   * per-card "..." 드롭다운 메뉴 항목 (학생 뷰).
   * 전달하면 카드 우측 상단에 드롭다운 버튼이 표시됩니다.
   */
  menuItems?: DropdownMenuItem[];
  /**
   * 이동 버튼 레이아웃 변형.
   * true: 텍스트 가운데 + 양쪽 화살표 (학생 뷰)
   * false(기본): 텍스트 왼쪽 + 오른쪽 화살표만 (교사 뷰)
   */
  moveBtnCentered?: boolean;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  title,
  subtitle,
  schedule,
  isSelected = false,
  onClick,
  onNavigate,
  navigateLabel = '과목 대기실로 이동',
  menuItems,
  moveBtnCentered = false,
}) => {
  const scheduleText = formatSchedule(schedule);

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''} ${onClick ? styles.cardClickable : ''}`}
      onClick={onClick}
    >
      {/* 상단 메타 행: schedule + 옵션 메뉴 */}
      <div className={styles.cardMeta}>
        <div className={styles.cardScheduleArea}>
          {scheduleText && (
            <div className={styles.cardSchedule}>
              <Clock size={14} strokeWidth={2.5} />
              {scheduleText}
            </div>
          )}
        </div>

        {/* per-card 드롭다운 — menuItems가 있을 때만 */}
        {menuItems && (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu
              trigger={
                <button className={styles.dotsBtn} aria-label="더보기">
                  <MoreHorizontal size={16} />
                </button>
              }
              items={menuItems}
            />
          </div>
        )}
      </div>

      {/* 제목 + 서브타이틀 */}
      <div className={styles.cardBody}>
        <div className={`${styles.cardTitle} ${isSelected ? styles.cardTitleSelected : ''}`}>
          {title}
        </div>
        {subtitle && (
          <div className={`${styles.cardSubtitle} ${isSelected ? styles.cardSubtitleSelected : ''}`}>
            {subtitle}
          </div>
        )}
      </div>

      {/* 이동 버튼 */}
      <button
        className={`${styles.moveBtn} ${isSelected ? styles.moveBtnSelected : ''} ${moveBtnCentered ? styles.moveBtnCentered : ''}`}
        onClick={(e) => { e.stopPropagation(); onNavigate(); }}
      >
        {moveBtnCentered ? (
          <>
            <ChevronLeft size={12} strokeWidth={2.5} />
            <span>{navigateLabel}</span>
            <ChevronRight size={12} strokeWidth={2.5} />
          </>
        ) : (
          <>
            <span>{navigateLabel}</span>
            <ChevronRight size={16} strokeWidth={2.5} />
          </>
        )}
      </button>
    </div>
  );
};
