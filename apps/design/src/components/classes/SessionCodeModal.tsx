'use client';

import React, { useState } from 'react';
import styles from './SessionCodeModal.module.css';

// ─── Props contract ────────────────────────────────────────────────────────────
// Downstream real app: replace `onRefreshCode` / `onToggleRegisterable` with
// your server action calls. `inviteCode` and `registerable` become controlled
// from the parent after each action resolves.
interface SessionCodeModalProps {
  inviteCode: string;
  registerable: boolean;
  currentStudents: number;
  maxStudents: number;
  onClose: () => void;
  onRefreshCode: () => void;
  onToggleRegisterable: () => void;
}

export const SessionCodeModal = ({
  inviteCode,
  registerable,
  currentStudents,
  maxStudents,
  onClose,
  onRefreshCode,
  onToggleRegisterable,
}: SessionCodeModalProps) => {
  const [copied, setCopied] = useState(false);
  // Local mirror so the toggle feels instant in the design
  const [blockNew, setBlockNew] = useState(!registerable);

  const codeChars = inviteCode.replace(/\s/g, '').split('');
  const usagePct  = Math.round((currentStudents / maxStudents) * 100);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = () => {
    setBlockNew((v) => !v);
    onToggleRegisterable();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className={styles.title}>입장 코드 관리</h2>

        {/* Code display */}
        <div className={styles.codeSection}>
          <div className={styles.codeTopRow}>
            <span className={styles.codeLabel}>입장 코드</span>
            <div className={styles.codeActions}>
              <button className={styles.actionBtn} onClick={handleCopy}>
                {copied ? '✓ 복사됨' : '복사하기'}
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                onClick={onRefreshCode}
              >
                재발급
              </button>
            </div>
          </div>
          <div className={styles.digitRow}>
            {codeChars.map((char, i) => (
              <div key={i} className={styles.digitBox}>{char}</div>
            ))}
          </div>
        </div>

        {/* Block new students toggle */}
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingTitle}>신규 진입 차단</span>
            <span className={styles.settingDesc}>코드를 알고 있어도 새로운 학생의 진입을 차단합니다.</span>
          </div>
          <div
            className={`${styles.toggle} ${blockNew ? styles.toggleOn : ''}`}
            onClick={handleToggle}
          >
            <div className={styles.toggleKnob} />
          </div>
        </div>

        {/* Usage stats */}
        <div className={styles.usageSection}>
          <div className={styles.usageTitle}>코드 사용 현황</div>
          <div className={styles.countRow}>
            <div>
              <div className={styles.countLabel}>현재 접속 학생</div>
              <div className={styles.countValue}>{currentStudents}명</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.countLabel}>최대 허용 학생</div>
              <div className={styles.countValue}>{maxStudents}명</div>
            </div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${usagePct}%` }} />
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
