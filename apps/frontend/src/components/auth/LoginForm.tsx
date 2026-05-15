'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '../common/ConfirmModal';
import styles from './LoginForm.module.css';

type Tab = 'student' | 'teacher';

interface LoginFormProps {
  onSignin: (email: string, password: string, role: 'student' | 'teacher') => Promise<void>;
  onSignup: (email: string, password: string, nickname: string, role: string) => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSignin, onSignup }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [signupRole, setSignupRole] = useState<Tab>('student');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ title: string; description?: string; onConfirm?: () => void } | null>(null);

  const closeModal = () => { modal?.onConfirm ? modal.onConfirm() : setModal(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        if (!nickname.trim()) {
          setModal({ title: '닉네임을 입력해주세요.' });
          setLoading(false);
          return;
        }
        await onSignup(email, password, nickname, signupRole.toUpperCase());
        setModal({
          title: '회원가입이 완료되었습니다.',
          description: '로그인해주세요.',
          onConfirm: () => { window.location.href = '/login'; },
        });
      } else {
        await onSignin(email, password, activeTab);
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (isSignup) {
        setModal({
          title: '회원가입에 실패했습니다.',
          description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        });
      } else {
        setModal({
          title: '로그인에 실패했습니다.',
          description: '이메일과 비밀번호를 확인해주세요.',
        });
      }
    }

    setLoading(false);
  };

  return (
    <>
    {modal && (
      <ConfirmModal
        title={modal.title}
        description={modal.description}
        cancelLabel="취소"
        confirmLabel="확인"
        onClose={closeModal}
        onConfirm={closeModal}
      />
    )}
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {!isSignup && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'student' ? styles.activeTab : styles.inactiveTab} ${activeTab !== 'student' ? styles.studentInactive : ''}`}
              onClick={() => setActiveTab('student')}
            >
              학생용
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'teacher' ? styles.activeTab : styles.inactiveTab} ${activeTab !== 'teacher' ? styles.teacherInactive : ''}`}
              onClick={() => setActiveTab('teacher')}
            >
              교사용
            </button>
          </div>
        )}

        <div className={styles.formContainer} style={{ marginTop: isSignup ? '1rem' : '0' }}>
          <h2 className={styles.title}>{isSignup ? '회원가입' : '로그인'}</h2>

          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>아이디</label>
              <input
                type="email"
                className={styles.input}
                placeholder="아이디를 입력하세요."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>비밀번호</label>
              <input
                type="password"
                className={styles.input}
                placeholder="비밀번호를 입력하세요."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isSignup && (
              <>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>가입 유형</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="student"
                        checked={signupRole === 'student'}
                        onChange={() => setSignupRole('student')}
                      />
                      학생
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="teacher"
                        checked={signupRole === 'teacher'}
                        onChange={() => setSignupRole('teacher')}
                      />
                      선생님
                    </label>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>닉네임</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="사용할 닉네임을 입력하세요."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className={styles.optionsRow}>
              {!isSignup && (
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" className={styles.checkbox} />
                  <span>아이디 저장</span>
                </label>
              )}
              {isSignup ? (
                <div className={styles.links} style={{ marginLeft: 'auto' }}>
                  <a href="#" className={styles.link} onClick={(e) => { e.preventDefault(); setIsSignup(false); }}>
                    이미 계정이 있으신가요? 로그인
                  </a>
                </div>
              ) : (
                <div className={styles.links}>
                  <a href="#" className={styles.link}>아이디 찾기</a>
                  <a href="#" className={styles.link}>비밀번호 찾기</a>
                  <span className={styles.divider}>|</span>
                  <a href="#" className={styles.link} onClick={(e) => { e.preventDefault(); setIsSignup(true); }}>
                    회원가입
                  </a>
                </div>
              )}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (isSignup ? '가입 중...' : '로그인 중...') : (isSignup ? '회원가입하기' : '로그인하기')}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
};
