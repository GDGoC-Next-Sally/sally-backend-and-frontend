'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LoginForm.module.css';
import { signinWithEmail } from '@/lib/supabase';

type Tab = 'student' | 'teacher';

export const LoginForm = () => {
  const [activeTab, setActiveTab] = useState<Tab>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await signinWithEmail(email, password);
      if (error) {
        console.warn('Supabase login failed, proceeding to dashboard for UI demonstration.');
      } else {
        console.log('로그인 성공! JWT 토큰: ', data.session?.access_token);
      }
    } catch (err) {
      console.warn('Supabase login error, proceeding to dashboard for UI demonstration.');
    }

    setLoading(false);
    router.push('/');
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
