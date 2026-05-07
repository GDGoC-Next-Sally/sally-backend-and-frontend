'use client';

import { useUser } from '@/utils/useUser';
import { signOut } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TopNav } from './TopNav';

export const TopNavWrapper = () => {
  const user = useUser();
  const router = useRouter();
  const handleSignOut = async () => { await signOut(); router.push('/login'); };

  const topNavUser = user ? {
    name: user.name ?? '사용자',
    email: user.email ?? '',
    role: (user.role ?? 'student') as 'teacher' | 'student' | 'admin',
  } : null;

  return <TopNav user={topNavUser} onSignOut={handleSignOut} />;
};
