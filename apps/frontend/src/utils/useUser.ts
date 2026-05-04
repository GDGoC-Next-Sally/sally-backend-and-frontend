'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
  role?: 'student' | 'teacher';
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async (userId: string, email?: string) => {
      const { data } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', userId)
        .single();

      setUser({
        id: userId,
        email,
        name: data?.name,
        role: data?.role === 'TEACHER' ? 'teacher' : 'student',
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setUser(null); return; }
      load(session.user.id, session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); return; }
      load(session.user.id, session.user.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
