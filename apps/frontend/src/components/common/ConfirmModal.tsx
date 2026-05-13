'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  /** 모달 제목 */
  title: string;
  /** 모달 설명 텍스트 (선택) */
  description?: string;
  /** 취소 버튼 라벨 (기본값: '취소') */
  cancelLabel?: string;
  /** 확인 버튼 라벨 (기본값: '확인') */
  confirmLabel?: string;
  /** 확인 버튼 비활성화 여부 */
  confirmDisabled?: boolean;
  /** 취소 버튼 클릭 / 오버레이 클릭 / X 버튼 클릭 시 호출 */
  onClose: () => void;
  /** 확인 버튼 클릭 시 호출 */
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  description,
  cancelLabel = '취소',
  confirmLabel = '확인',
  confirmDisabled = false,
  onClose,
  onConfirm,
}) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 본문 */}
        <div className={styles.body}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>{title}</h2>
              <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
                <X size={22} />
              </button>
            </div>
            <hr className={styles.divider} />
          </div>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
