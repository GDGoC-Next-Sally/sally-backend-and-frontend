'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LoginForm.module.css';
import { signinWithEmail } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { fetchWithAuth } from '@/lib/api';

type Tab = 'student' | 'teacher';

export const LoginForm = () => {
  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await signinWithEmail(email, password);
      if (error || !data.session) {
        console.warn('Supabase login failed or no session, proceeding to dashboard for UI demonstration.');
        router.push(activeTab === 'teacher' ? '/t/home' : '/s/home');
      } else {
        const token = data.session.access_token;
        console.log('로그인 성공! JWT 토큰 획득:', token);
        
        // 전역 상태에 유저 및 토큰 저장
        setAuth({
          id: data.session.user.id,
          email: data.session.user.email,
          role: activeTab, // 현재 선택된 탭을 역할로 저장
        }, token);

        // 백엔드 연동 테스트 (선택 사항)
        try {
          const profile = await fetchWithAuth('/profile');
          console.log('백엔드 연동 테스트 성공 (프로필 정보):', profile);
        } catch (apiErr) {
          console.error('백엔드 연동 테스트 실패:', apiErr);
        }

        // 로그인 성공 시 역할에 맞는 홈으로 리다이렉트
        router.push(activeTab === 'teacher' ? '/t/home' : '/s/home');
      }
    } catch (err) {
      console.warn('Supabase login error, proceeding to dashboard for UI demonstration.');
      router.push(activeTab === 'teacher' ? '/t/home' : '/s/home');
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
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

        <div className={styles.formContainer}>
          <h2 className={styles.title}>로그인</h2>
          
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

            <div className={styles.optionsRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                <span>아이디 저장</span>
              </label>
              <div className={styles.links}>
                <a href="#" className={styles.link}>아이디 찾기</a>
                <a href="#" className={styles.link}>비밀번호 찾기</a>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '로그인 중...' : '로그인하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
