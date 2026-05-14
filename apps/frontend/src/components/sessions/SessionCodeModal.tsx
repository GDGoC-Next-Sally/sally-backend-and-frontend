'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import styles from './SessionCodeModal.module.css';

interface SessionCodeModalProps {
  onClose: () => void;
  classId: number;
  inviteCode?: string;
  onRefreshCode: () => void;
}

export const SessionCodeModal: React.FC<SessionCodeModalProps> = ({
  onClose,
  classId,
  inviteCode,
  onRefreshCode,
}) => {
  const [code, setCode] = useState(inviteCode ?? '--------');

  // Sync code when parent refreshes invite_code after regeneration
  useEffect(() => {
    if (inviteCode) setCode(inviteCode);
  }, [inviteCode]);
  const [copied, setCopied] = useState(false);
  const [isReissueConfirmOpen, setIsReissueConfirmOpen] = useState(false);

  const codeChars = code.replace(/\s/g, '').split('');

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleReissue = () => {
    setIsReissueConfirmOpen(true);
  };

  const handleReissueConfirm = () => {
    setIsReissueConfirmOpen(false);
    onRefreshCode();
  };

  return (
    <>
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <h2 className={styles.title}>입장 코드 관리</h2>

        <div className={styles.codeSection}>
          <div className={styles.codeTopRow}>
            <span className={styles.codeLabel}>입장 코드</span>
            <div className={styles.codeActions}>
              <button className={styles.actionBtn} onClick={handleCopy}>
                {copied ? '✓ 복사됨' : '복사하기'}
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                onClick={handleReissue}
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

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.confirmBtn} onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
    {isReissueConfirmOpen && (
      <ConfirmModal
        title="입장 코드를 재발급하시겠습니까?"
        description="기존 코드는 더 이상 사용할 수 없습니다."
        confirmLabel="재발급"
        onClose={() => setIsReissueConfirmOpen(false)}
        onConfirm={handleReissueConfirm}
      />
    )}
    </>
  );
};
