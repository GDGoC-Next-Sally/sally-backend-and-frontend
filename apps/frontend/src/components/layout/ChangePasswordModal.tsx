'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, CheckCircle } from 'lucide-react';
import styles from './ChangePasswordModal.module.css';

interface Props {
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: supabaseError } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
          <X size={22} />
        </button>

        <h2 className={styles.title}>비밀번호 변경</h2>
        <hr className={styles.divider} />

        {success ? (
          <div className={styles.successBody}>
            <CheckCircle size={48} color="var(--color-live)" />
            <p className={styles.successText}>비밀번호가 성공적으로 변경되었어요.</p>
            <button className={styles.confirmBtn} onClick={onClose}>확인</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>새 비밀번호</label>
              <input
                type="password"
                className={styles.input}
                placeholder="6자 이상 입력해주세요"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>새 비밀번호 확인</label>
              <input
                type="password"
                className={`${styles.input} ${confirmPassword && newPassword !== confirmPassword ? styles.inputError : ''}`}
                placeholder="비밀번호를 다시 입력해주세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <span className={styles.fieldError}>비밀번호가 일치하지 않아요.</span>
              )}
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>취소</button>
              <button type="submit" className={styles.confirmBtn} disabled={!isValid || loading}>
                {loading ? '변경 중...' : '변경하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
