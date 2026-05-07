'use client';

import { TopNav } from '@/components/layout/TopNav';
import { MOCK_STUDENT } from '@/mock/data';
import { usePathname } from 'next/navigation';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePage =
    pathname?.includes('/classes') ? 'classes' :
    pathname?.includes('/home')    ? 'home'    : undefined;

  return (
    <>
      <TopNav user={MOCK_STUDENT} activePage={activePage} />
      {children}
    </>
  );
}
