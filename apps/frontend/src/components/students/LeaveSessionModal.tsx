'use client';

import React from 'react';
import styles from './LeaveSessionModal.module.css';

interface Props {
  onClose: () => void;
  onLeave: () => void;
}

export const LeaveSessionModal: React.FC<Props> = ({ onClose, onLeave }) => (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <button className={styles.closeBtn} onClick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className={styles.iconWrap}>
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          {/* Door frame */}
          <rect x="18" y="10" width="44" height="64" rx="5" fill="#b2f2bb" stroke="#6B6B6B" strokeWidth="2" />
          {/* Door swing */}
          <path d="M62 10 L78 20 L78 66 L62 74" stroke="#6B6B6B" strokeWidth="2" fill="#D1FAE5" />
          {/* Doorknob */}
          <circle cx="56" cy="43" r="3.5" fill="#6B6B6B" />
          {/* Arrow pointing right (leaving) */}
          <path d="M45 43 L68 43" stroke="#6B6B6B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M62 37 L68 43 L62 49" stroke="#6B6B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Warning badge */}
          <circle cx="72" cy="76" r="12" fill="#E8593C" />
          <text x="72" y="81" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
        </svg>
      </div>

      <h2 className={styles.title}>정말로 클래스를 나가시겠어요?</h2>

      <div className={styles.warningBox}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8593C" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className={styles.warningText}>
          나가시면 진행 중인 수업에 참여할 수 없고,<br />출석이 기록되지 않을 수 있어요.
        </p>
      </div>

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>계속 참여</button>
        <button className={styles.leaveBtn} onClick={onLeave}>나가기</button>
      </div>
    </div>
  </div>
);
