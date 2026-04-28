'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signinWithEmail } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await signinWithEmail(email, password);
    setLoading(false);

    if (error) {
      alert('로그인 실패: ' + error.message);
      return;
    }

    const token = data.session?.access_token;
    console.log('로그인 성공! JWT 토큰: ', token);
    alert(`로그인 성공! JWT 토큰: ${token}`);
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-800 bg-gray-900/50 p-10 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Sally AI Coach</h1>
          <p className="mt-2 text-sm text-gray-400">환영합니다! 계정에 로그인하세요.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">이메일 주소</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-pointer"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold text-blue-400 hover:text-blue-300">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
