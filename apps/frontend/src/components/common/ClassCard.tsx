'use client';

import React from 'react';
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';
import styles from './ClassCard.module.css';

interface ClassCardProps {
  /** 카드 메인 타이틀 */
  title: string;
  /** 카드 서브타이틀 */
  subtitle?: string;
  /** 수업 시간표 — 있을 때만 표시 */
  schedule?: string | null;
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
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''} ${onClick ? styles.cardClickable : ''}`}
      onClick={onClick}
    >
      {/* 상단 메타 행: schedule + 옵션 메뉴 */}
      <div className={styles.cardMeta}>
        <div className={styles.cardScheduleArea}>
          {schedule && (
            <div className={styles.cardSchedule}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {schedule}
            </div>
          )}
        </div>

        {/* per-card 드롭다운 — menuItems가 있을 때만 */}
        {menuItems && (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu
              trigger={
                <button className={styles.dotsBtn} aria-label="더보기">
                  <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
                    <circle cx="2" cy="2" r="1.5" />
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="14" cy="2" r="1.5" />
                  </svg>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{navigateLabel}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </>
        ) : (
          <>
            <span>{navigateLabel}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
};
