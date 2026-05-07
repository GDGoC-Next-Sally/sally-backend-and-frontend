'use client';

import { TopNav } from '@/components/layout/TopNav';
import { MOCK_TEACHER } from '@/mock/data';
import { usePathname } from 'next/navigation';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePage =
    pathname?.includes('/classes') ? 'classes' :
    pathname?.includes('/home')    ? 'home'    : undefined;

  return (
    <>
      <TopNav user={MOCK_TEACHER} activePage={activePage} />
      {children}
    </>
  );
}
