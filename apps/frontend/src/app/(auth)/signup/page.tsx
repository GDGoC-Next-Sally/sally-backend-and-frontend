'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signupWithEmail } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './Signup.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    const { data, error } = await signupWithEmail(email, password, name, role);

    setLoading(false);

    if (error) {
      alert('회원가입 실패: ' + error.message);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>시작하기</h1>
        <p className={styles.subheading}>Sally AI Coach와 함께 성장을 시작하세요.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>이름</label>
            <input
              type="text"
              required
              className={styles.input}
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>역할 선택</label>
            <div className={styles.roleContainer}>
              <label className={`${styles.roleOption} ${role === 'STUDENT' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="STUDENT"
                  checked={role === 'STUDENT'}
                  onChange={() => setRole('STUDENT')}
                  className={styles.radioHidden}
                />
                학생
              </label>
              <label className={`${styles.roleOption} ${role === 'TEACHER' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="TEACHER"
                  checked={role === 'TEACHER'}
                  onChange={() => setRole('TEACHER')}
                  className={styles.radioHidden}
                />
                선생님
              </label>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>이메일 주소</label>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>비밀번호</label>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>비밀번호 확인</label>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? '처리 중...' : '계정 생성'}
          </button>
        </form>

        <p className={styles.footer}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className={styles.link}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
