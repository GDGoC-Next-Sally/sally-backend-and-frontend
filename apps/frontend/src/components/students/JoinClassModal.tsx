'use client';

import React, { useRef, useState } from 'react';
import { X, Info } from 'lucide-react';
import styles from './JoinClassModal.module.css';

interface Props {
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<void>;
}

export const JoinClassModal: React.FC<Props> = ({ onClose, onJoin }) => {
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const inviteCode = digits.join('');
  const isComplete = digits.every((d) => d !== '');

  const handleDigit = (idx: number, val: string) => {
    const ch = val.replace(/\s/g, '').toUpperCase().slice(-1);
    const next = [...digits];
    next[idx] = ch;
    setDigits(next);
    setError('');
    if (ch && idx < 7) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\s/g, '').toUpperCase().slice(0, 8);
    if (!text) return;
    e.preventDefault();
    const next = Array(8).fill('');
    text.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(text.length, 7)]?.focus();
  };

  const handleJoin = async () => {
    setLoading(true);
    setError('');
    try {
      await onJoin(inviteCode);
      onClose();
    } catch (err: any) {
      setError(err.message || '유효하지 않은 코드이거나 참여에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className={styles.title}>새 클래스 참여</h2>
        <p className={styles.subtitle}>
          선생님이 제공한 입장 코드를 입력하여<br />클래스에 참여할 수 있습니다.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.label}>입장 코드</label>
          <div className={styles.digitRow} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                className={styles.digitBox}
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>
          {error && (
            <div className={styles.errorMsg}>
              <Info size={14} strokeWidth={2.5} />
              {error}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            취소
          </button>
          <button
            className={styles.joinBtn}
            onClick={handleJoin}
            disabled={!isComplete || loading}
          >
            {loading ? '처리 중...' : '참여하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
