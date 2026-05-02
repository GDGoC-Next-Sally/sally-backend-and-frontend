'use client';

import React, { useState } from 'react';
import styles from './SessionCodeModal.module.css';

interface SessionCodeModalProps {
  onClose: () => void;
  inviteCode?: string;
}

export const SessionCodeModal: React.FC<SessionCodeModalProps> = ({ onClose, inviteCode }) => {
  const [blockNew, setBlockNew] = useState(false);
  const displayCode = inviteCode ?? '12333456';
  const codeChars = displayCode.replace(/\s/g, '').split('');

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode).catch(() => {});
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className={styles.title}>입장 코드 관리</h2>

        <div className={styles.codeSection}>
          <div className={styles.codeTopRow}>
            <span className={styles.codeLabel}>입장 코드</span>
            <div className={styles.codeActions}>
              <button className={styles.actionBtn} onClick={handleCopy}>복사하기</button>
              <button className={`${styles.actionBtn} ${styles.actionBtnGreen}`}>재발급</button>
            </div>
          </div>
          <div className={styles.digitRow}>
            {codeChars.map((char, i) => (
              <div key={i} className={styles.digitBox}>{char}</div>
            ))}
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingTitle}>신규 진입 차단</span>
            <span className={styles.settingDesc}>코드를 알고 있어도 새로운 학생의 진입을 차단합니다.</span>
          </div>
          <div
            className={`${styles.toggle} ${blockNew ? styles.toggleOn : ''}`}
            onClick={() => setBlockNew((v) => !v)}
          >
            <div className={styles.toggleKnob} />
          </div>
        </div>

        <div className={styles.usageSection}>
          <div className={styles.usageTitle}>코드 사용 현황</div>
          <div className={styles.countRow}>
            <div>
              <div className={styles.countLabel}>현재 접속 학생</div>
              <div className={styles.countValue}>26명</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.countLabel}>최대 허용 학생</div>
              <div className={styles.countValue}>50명</div>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '52%' }} />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.confirmBtn} onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  );
};
