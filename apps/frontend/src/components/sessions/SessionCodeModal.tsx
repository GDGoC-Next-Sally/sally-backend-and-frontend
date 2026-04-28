'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './SessionCodeModal.module.css';

interface SessionCodeModalProps {
  onClose: () => void;
}

export const SessionCodeModal: React.FC<SessionCodeModalProps> = ({ onClose }) => {
  const router = useRouter();
  const params = useParams();
  
  const classId = params.id as string;
  const sessionId = params.sessionId as string;

  const [blockNew, setBlockNew] = useState(false);
  const [useCode, setUseCode] = useState(false);

  const handleStartClass = () => {
    // Navigate to the active session view
    router.push(`/classes/${classId}/sessions/${sessionId}/active`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>세션 입장 코드</h2>
        
        <div className={styles.codeBox}>
          <div className={styles.codeHeader}>
            <span className={styles.codeLabel}>입장 코드</span>
            <div className={styles.codeActions}>
              <button className={styles.actionBtn}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                복사하기
              </button>
              <button className={`${styles.actionBtn} ${styles.actionBtnGreen}`}>재발급</button>
            </div>
          </div>
          <div className={styles.codeText}>A7K9 3LQ2</div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingTitle}>신규 진입 차단</span>
            <span className={styles.settingDesc}>코드를 알고 있어도 새로운 학생의 진입을 차단합니다.</span>
          </div>
          <div className={`${styles.toggle} ${blockNew ? styles.toggleOn : ''}`} onClick={() => setBlockNew(!blockNew)}>
            <div className={styles.toggleKnob}></div>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingTitle}>코드 사용 현황</span>
            <span className={styles.settingDesc}>코드를 알고 있어도 새로운 학생의 진입을 차단합니다.</span>
            
            <div className={styles.studentCountBox}>
              <div className={styles.countLabels}>
                <div className={styles.countLabelLeft}>
                  <span className={styles.countSmall}>현재 접속 학생</span>
                  <span className={styles.countBig}>26명</span>
                </div>
                <div className={styles.countLabelRight}>
                  <span className={styles.countSmall}>최대 허용 학생</span>
                  <span className={styles.countBig}>50명</span>
                </div>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill}></div>
              </div>
            </div>
          </div>
          <div className={`${styles.toggle} ${useCode ? styles.toggleOn : ''}`} onClick={() => setUseCode(!useCode)}>
            <div className={styles.toggleKnob}></div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.startBtn} onClick={handleStartClass}>수업 시작하기</button>
        </div>
      </div>
    </div>
  );
};
