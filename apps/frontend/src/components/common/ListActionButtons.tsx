'use client';

import React from 'react';
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';
import styles from './ListActionButtons.module.css';

interface ListActionButtonsProps {
  /** 추가하기 버튼 레이블 (예: "클래스 만들기", "새로운 과목") */
  primaryLabel: string;
  onPrimary: () => void;
  /** 더보기 드롭다운 항목 */
  moreItems: DropdownMenuItem[];
  /**
   * 더보기 버튼을 비활성화할지 여부.
   * 보통 아이템이 선택되지 않았을 때 true.
   * @default true
   */
  moreDisabled?: boolean;
}

export const ListActionButtons: React.FC<ListActionButtonsProps> = ({
  primaryLabel,
  onPrimary,
  moreItems,
  moreDisabled = true,
}) => {
  return (
    <div className={styles.actionButtons}>
      <button className={styles.primaryBtn} onClick={onPrimary}>
        {primaryLabel}
      </button>
      <DropdownMenu
        trigger={
          <button
            className={`${styles.moreBtn} ${!moreDisabled ? styles.moreBtnActive : ''}`}
            disabled={moreDisabled}
          >
            더보기
          </button>
        }
        items={moreItems}
      />
    </div>
  );
};
