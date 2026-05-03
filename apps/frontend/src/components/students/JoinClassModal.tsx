'use client';

import React, { useRef, useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import styles from './JoinClassModal.module.css';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

interface FoundClass {
  id: number;
  subject: string;
  grade: number;
  homeroom: string;
  users: { name: string };
}

export const JoinClassModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [digits, setDigits] = useState<string[]>(Array(8).fill(''));
  const [validated, setValidated] = useState(false);
  const [foundClass, setFoundClass] = useState<FoundClass | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const inviteCode = digits.join('');

  useEffect(() => {
    if (inviteCode.length === 8) {
      validateCode(inviteCode);
    } else {
      setValidated(false);
      setFoundClass(null);
      setError('');
    }
  }, [inviteCode]);

  const validateCode = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithAuth(`/classes/code/${code}`);
      setFoundClass(data);
      setValidated(true);
    } catch (err) {
      setError('유효하지 않은 코드입니다.');
      setValidated(false);
      setFoundClass(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (idx: number, val: string) => {
    const ch = val.replace(/\s/g, '').toUpperCase().slice(-1);
    const next = [...digits];
    next[idx] = ch;
    setDigits(next);
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
      await fetchWithAuth('/classes/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || '참여에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
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
          {validated && (
            <p className={styles.validMsg}>✓ 유효한 코드입니다.</p>
          )}
          {error && (
            <p className={styles.errorMsg}>{error}</p>
          )}
        </div>

        {validated && foundClass && (
          <div className={styles.formGroup}>
            <label className={styles.label}>예상 클래스 정보</label>
            <div className={styles.classInfoBox}>
              <span className={styles.classInfoName}>
                {foundClass.grade}학년 {foundClass.homeroom} {foundClass.subject}
              </span>
              <span className={styles.classInfoTeacher}>{foundClass.users.name} 선생님</span>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            취소
          </button>
          <button
            className={styles.joinBtn}
            onClick={handleJoin}
            disabled={!validated || loading}
          >
            {loading ? '처리 중...' : '참여하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
