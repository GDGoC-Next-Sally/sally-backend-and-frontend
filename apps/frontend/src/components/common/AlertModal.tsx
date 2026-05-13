'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface AlertModalProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  title,
  description,
  confirmLabel = '확인',
  onClose,
}) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
          {description && <p className={styles.description}>{description}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.confirmBtn} onClick={onClose}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
