import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getProfile } from '@/actions/auth';

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const profile = await getProfile();
    if (profile?.role === 'TEACHER' || profile?.role === 'ADMIN') {
      redirect('/t/home');
    } else {
      redirect('/s/home');
    }
  } catch {
    redirect('/login');
  }
}
