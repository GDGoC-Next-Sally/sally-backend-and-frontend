'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { HomeIcon } from '../icons/HomeIcon';
import { BookIcon } from '../icons/BookIcon';
import { GridIcon } from '../icons/GridIcon';
import styles from './TopNav.module.css';
import type { User } from '@/mock/types';

// ─── Props contract ────────────────────────────────────────────────────────────
// Downstream real app: replace `user` with your auth hook result and wire
// `onSignOut` to your actual sign-out action.
interface TopNavProps {
  user: User;
  activePage?: 'home' | 'classes' | 'grid';
  onSignOut?: () => void;
}

export const TopNav = ({ user, activePage, onSignOut }: TopNavProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleTitle = user.role === 'teacher' ? '선생님' : '학생';
  const homeHref = user.role === 'teacher' ? '/t/home' : '/s/home';
  const classesHref = user.role === 'teacher' ? '/t/classes' : '/s/classes';

  return (
    <nav className={styles.nav}>
      <div className={styles.logoPlaceholder} />

      <div className={styles.centerIcons}>
        <Link
          href={homeHref}
          className={`${styles.iconWrapper} ${activePage === 'home' ? styles.activeIcon : ''}`}
        >
          <HomeIcon className="w-6 h-6" />
        </Link>
        <Link
          href={classesHref}
          className={`${styles.iconWrapper} ${activePage === 'classes' ? styles.activeIcon : ''}`}
        >
          <BookIcon className="w-6 h-6" />
        </Link>
        <div className={styles.iconWrapper}>
          <GridIcon className="w-6 h-6" />
        </div>
      </div>

      <div className={styles.profileWrapper} ref={dropdownRef}>
        <button
          type="button"
          className={styles.rightSection}
          onClick={() => setDropdownOpen((v) => !v)}
        >
          <div className={styles.avatar} />
          <span className={styles.userName}>{user.name} {roleTitle}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`${styles.dropdownArrow} ${dropdownOpen ? styles.dropdownArrowOpen : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {dropdownOpen && (
          <>
            <div className={styles.dropdownBackdrop} onClick={() => setDropdownOpen(false)} />
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownName}>{user.name}</p>
                <p className={styles.dropdownEmail}>{user.email}</p>
              </div>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); onSignOut?.(); }}
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};
