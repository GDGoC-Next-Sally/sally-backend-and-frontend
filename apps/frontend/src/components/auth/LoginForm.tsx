'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LoginForm.module.css';
import { signinWithEmail, signupWithEmail } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { fetchWithAuth } from '@/lib/api';

type Tab = 'student' | 'teacher';

export const LoginForm = () => {
  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [signupRole, setSignupRole] = useState<Tab>('student');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        // 회원가입 처리
        if (!nickname.trim()) {
          alert('닉네임을 입력해주세요.');
          setLoading(false);
          return;
        }
        const { data, error } = await signupWithEmail(email, password, nickname, signupRole.toUpperCase());
        if (error) {
          console.error('Supabase signup error:', error);
          alert(`회원가입 실패: ${error.message}`);
        } else {
          alert('회원가입이 완료되었습니다! 로그인해주세요.');
          setIsSignup(false); // 다시 로그인 화면으로
          setPassword('');
        }
      } else {
        // 로그인 처리
        const { data, error } = await signinWithEmail(email, password);
        if (error || !data.session) {
          console.warn('Supabase login failed:', error);
          alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
        } else {
          const token = data.session.access_token;
          console.log('로그인 성공! JWT 토큰 획득:', token);

          // 먼저 토큰을 스토어에 저장해야 fetchWithAuth가 토큰을 사용할 수 있습니다.
          setAuth({
            id: data.session.user.id,
            email: data.session.user.email,
            role: 'student', // 임시 저장
          }, token);

          // 백엔드 연동: /auth/profile 호출하여 실제 권한 받아오기
          try {
            const profile = await fetchWithAuth('/auth/profile');
            console.log('백엔드 프로필 정보 획득:', profile);

            // 서버에서 넘어온 정보 (예: { userId, email, name, role })
            const serverRole = profile?.role;
            const serverName = profile?.name;
            const finalRole = serverRole === 'TEACHER' ? 'teacher' : (serverRole === 'ADMIN' ? activeTab : 'student');
            
            // 전역 상태 업데이트 (이름과 서버 권한 반영)
            setAuth({
              id: data.session.user.id,
              email: data.session.user.email,
              name: serverName,
              role: finalRole,
            }, token);

            // 2. 역할에 맞는 홈으로 리다이렉트 (관리자는 선택한 탭에 따라 이동)
            if (serverRole === 'ADMIN') {
              router.push(activeTab === 'teacher' ? '/t/home' : '/s/home');
            } else if (serverRole === 'TEACHER') {
              router.push('/t/home');
            } else {
              router.push('/s/home');
            }
          } catch (apiErr) {
            console.error('백엔드 연동 테스트 실패:', apiErr);
            alert('사용자 정보를 불러오는데 실패했습니다.');
          }
        }
      }
    } catch (err) {
      console.error('Supabase error:', err);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    setLoading(false);
  };

  return (
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
  );
};
