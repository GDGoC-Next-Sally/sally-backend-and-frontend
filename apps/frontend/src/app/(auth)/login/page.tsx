'use client';

import { useRouter } from 'next/navigation';
import { signinWithEmail, signupWithEmail } from '@/lib/supabase';
import { getProfile } from '@/actions/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  const handleSignin = async (email: string, password: string, role: 'student' | 'teacher') => {
    const { data, error } = await signinWithEmail(email, password);
    if (error || !data.session) {
      throw new Error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
    try {
      const profile = await getProfile();
      const serverRole = profile?.role;
      if (serverRole === 'ADMIN') {
        router.push(role === 'teacher' ? '/t/home' : '/s/home');
      } else if (serverRole === 'TEACHER') {
        router.push('/t/home');
      } else {
        router.push('/s/home');
      }
    } catch {
      throw new Error('사용자 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleSignup = async (email: string, password: string, nickname: string, role: string) => {
    const { error } = await signupWithEmail(email, password, nickname, role);
    if (error) {
      throw new Error(`회원가입 실패: ${error.message}`);
    }
  };

  return <LoginForm onSignin={handleSignin} onSignup={handleSignup} />;
}
