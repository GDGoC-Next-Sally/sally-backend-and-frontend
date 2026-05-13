'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import styles from './LeaveSessionModal.module.css';

interface Props {
  onClose: () => void;
  onLeave: () => void;
}

export const LeaveSessionModal: React.FC<Props> = ({ onClose, onLeave }) => (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <button className={styles.closeBtn} onClick={onClose}>
        <X size={18} />
      </button>

      <div className={styles.iconWrap}>
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          {/* Door frame */}
          <rect x="18" y="10" width="44" height="64" rx="5" fill="#E5F9F0" stroke="#797c7c" strokeWidth="2" />
          {/* Door swing */}
          <path d="M62 10 L78 20 L78 66 L62 74" stroke="#797c7c" strokeWidth="2" fill="#E5F9F0" />
          {/* Doorknob */}
          <circle cx="56" cy="43" r="3.5" fill="#797c7c" />
          {/* Arrow pointing right (leaving) */}
          <path d="M45 43 L68 43" stroke="#797c7c" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M62 37 L68 43 L62 49" stroke="#797c7c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Warning badge */}
          <circle cx="72" cy="76" r="12" fill="#ff6f6f" />
          <text x="72" y="81" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
        </svg>
      </div>

      <h2 className={styles.title}>정말로 클래스를 나가시겠어요?</h2>

      <div className={styles.warningBox}>
        <AlertTriangle size={16} color="#ff6f6f" style={{ flexShrink: 0 }} />
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
