'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HomeIcon } from '../icons/HomeIcon';
import { BookIcon } from '../icons/BookIcon';
import { GridIcon } from '../icons/GridIcon';
import styles from './TopNav.module.css';
import { useUser } from '@/utils/useUser';

export const TopNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();

  // 닉네임과 직함 설정
  const displayName = user?.name || '사용자';
  const roleTitle = user?.role === 'teacher' ? '선생님' : '학생';

  const homeHref =
    user?.role === 'teacher' ? '/t/home' :
    user?.role === 'student' ? '/s/home' :
    '/';

  const classesHref =
    user?.role === 'teacher' ? '/t/classes' :
    user?.role === 'student' ? '/s/classes' :
    '/classes';

  const isHomePage =
    pathname === '/' ||
    pathname === '/t/home' ||
    pathname === '/s/home';

  const isClassesPage = pathname?.includes('/classes');

  return (
    <nav className={styles.nav}>
      <div className={styles.logoPlaceholder}></div>

      <div className={styles.centerIcons}>
        <Link href={homeHref} className={`${styles.iconWrapper} ${isHomePage ? styles.activeIcon : ''}`}>
          <HomeIcon className="w-6 h-6" />
        </Link>
        <Link href={classesHref} className={`${styles.iconWrapper} ${isClassesPage ? styles.activeIcon : ''}`}>
          <BookIcon className="w-6 h-6" />
        </Link>
        <div className={styles.iconWrapper}>
          <GridIcon className="w-6 h-6" />
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.avatar}>
          {/* Using a simple div instead of user icon for exact look from design if needed, but user avatar icon is good */}
        </div>
        <span className={styles.userName}>{displayName} {roleTitle}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.dropdownArrow}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </nav>
  );
};
