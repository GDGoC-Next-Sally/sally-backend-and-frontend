'use client';

import { useState } from 'react';
import { signOut } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const testBackend = async () => {
    // 1. 브라우저에 저장된 세션(토큰) 가져오기
    // (지금은 테스트를 위해 아까 console.log로 찍은 토큰을 직접 붙여넣거나, 
    // supabase.auth.getSession()을 통해 가져올 수 있습니다.)
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      alert('로그인이 필요합니다!');
      return;
    }
  
    try {
      // 2. 백엔드 API 호출 (헤더에 토큰 포함)
      const response = await fetch('http://localhost:3001/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('에러 발생:', error);
      setResult({ error: '백엔드 연결 실패' });
    }
  };

  const handleLogout = async () => {
    await signOut();
    alert('로그아웃 되었습니다.');
    setResult(null); 
    router.push('/login'); 
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Sally AI Coach</h1>
      
      <button
        onClick={testBackend}
        className="rounded-lg bg-green-600 px-6 py-3 font-semibold hover:bg-green-500 transition-all cursor-pointer"
      >
        백엔드 보안 API 테스트 (Profile)
      </button>

      {result && (
        <pre className="mt-8 p-6 rounded-xl border border-gray-800 bg-gray-900 overflow-auto max-w-full">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-6 py-3 font-semibold hover:bg-red-500 transition-all cursor-pointer"
        >
          로그아웃
      </button>
    </div>
  );
}
