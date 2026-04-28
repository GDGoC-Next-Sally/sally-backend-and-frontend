'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signupWithEmail } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    const { data, error } = await signupWithEmail(email, password);

    setLoading(false);

    if (error) {
      alert('회원가입 실패: ' + error.message);
    } else {
      alert('회원가입 성공! 이메일을 확인해주세요.');
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-800 bg-gray-900/50 p-10 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">시작하기</h1>
          <p className="mt-2 text-sm text-gray-400">Sally AI Coach와 함께 성장을 시작하세요.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">이메일 주소</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">비밀번호</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">비밀번호 확인</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-all cursor-pointer"
          >
            {loading ? '처리 중...' : '계정 생성'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
