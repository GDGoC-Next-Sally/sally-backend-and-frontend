'use client';

import React from 'react';
import styles from './StudentSessionEndModal.module.css';

interface Props {
  onClose: () => void;
  onNext: () => void;
}

export const StudentSessionEndModal: React.FC<Props> = ({ onClose, onNext }) => (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <button className={styles.closeBtn} onClick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <h2 className={styles.title}>수업이 종료되었습니다.</h2>

      <div className={styles.gradeSection}>
        <p className={styles.gradeLabel}>성취도</p>
        <div className={styles.donutWrap}>
          <svg viewBox="0 0 100 100" width="130" height="130">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#EBEBEA" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#22C55E"
              strokeWidth="8"
              strokeDasharray="220 44"
              strokeDashoffset="55"
              strokeLinecap="round"
            />
          </svg>
          <div className={styles.donutText}>A</div>
        </div>
        <p className={styles.gradeMsg}>참 잘했어요!</p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>참여도</span>
          <span className={styles.statValue}>98%</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>퀴즈 정답률</span>
          <span className={styles.statValue}>92%</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>집중도</span>
          <span className={styles.statValue}>90%</span>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>취소</button>
        <button className={styles.nextBtn} onClick={onNext}>다음</button>
      </div>
    </div>
  </div>
);
