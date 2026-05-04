'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
  role?: 'student' | 'teacher';
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

export function setUserCookies(name: string, role: string) {
  document.cookie = `app-user-name=${encodeURIComponent(name)}; path=/; SameSite=Lax`;
  document.cookie = `app-user-role=${encodeURIComponent(role)}; path=/; SameSite=Lax`;
}

export function clearUserCookies() {
  document.cookie = 'app-user-name=; path=/; max-age=0';
  document.cookie = 'app-user-role=; path=/; max-age=0';
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setUser(null); return; }

      setUser({
        id: session.user.id,
        email: session.user.email,
        name: getCookie('app-user-name') ?? session.user.user_metadata?.name,
        role: (getCookie('app-user-role') as AppUser['role']) ?? session.user.user_metadata?.role,
      });
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); return; }
      setUser({
        id: session.user.id,
        email: session.user.email,
        name: getCookie('app-user-name') ?? session.user.user_metadata?.name,
        role: (getCookie('app-user-role') as AppUser['role']) ?? session.user.user_metadata?.role,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
