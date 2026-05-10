'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';
import { ChangePasswordModal } from './ChangePasswordModal';

interface TopNavUser {
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
}

interface TopNavProps {
  user: TopNavUser | null;
  onSignOut?: () => void;
}

function HomeNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.99 8.99a.75.75 0 1 1-1.06 1.06L12 5.432 3.54 13.89a.75.75 0 1 1-1.06-1.06l8.99-8.99Z"
        fill={active ? '#22cb84' : '#1A1A1A'}
      />
      <path
        d="M12 5.432 4.5 12.932V20.25c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-4.5h3v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-7.318L12 5.432Z"
        fill={active ? '#22cb84' : '#1A1A1A'}
      />
    </svg>
  );
}

function ClassNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1ZM6 4h12v12H6V4Zm0 16v-2h12v2H6Z"
        fill={active ? '#22cb84' : '#1A1A1A'}
      />
      <rect x="8" y="7" width="8" height="1.5" rx="0.75" fill={active ? '#22cb84' : '#1A1A1A'} />
      <rect x="8" y="10" width="5" height="1.5" rx="0.75" fill={active ? '#22cb84' : '#1A1A1A'} />
    </svg>
  );
}

function ReportNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? '#22cb84' : '#1A1A1A'} />
      <rect x="14" y="3" width="7" height="7" rx="1" fill={active ? '#22cb84' : '#1A1A1A'} />
      <rect x="3" y="14" width="7" height="7" rx="1" fill={active ? '#22cb84' : '#1A1A1A'} />
      <rect x="14" y="14" width="7" height="7" rx="1" fill={active ? '#22cb84' : '#1A1A1A'} />
    </svg>
  );
}

export const TopNav: React.FC<TopNavProps> = ({ user, onSignOut }) => {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleTitle = user?.role === 'teacher' ? '선생님' : '학생';

  const homeHref = user?.role === 'teacher' ? '/t/home' : user?.role === 'student' ? '/s/home' : '/';
  const classesHref = user?.role === 'teacher' ? '/t/classes' : user?.role === 'student' ? '/s/classes' : '/classes';
  const reportHref = user?.role === 'teacher' ? '/t/reports' : user?.role === 'student' ? '/s/reports' : '/reports';

  const isHomePage = pathname === '/' || pathname === '/t/home' || pathname === '/s/home';
  const isClassesPage = pathname?.includes('/classes');
  const isReportPage = pathname?.includes('/reports');

  return (
    <>
    <nav className={styles.nav}>
      {/* 로고 */}
      <Link href={homeHref} className={styles.logo}>
        <img src="/images/image_sallylogo.png" alt="Sally 로고" className={styles.logoImage} />
      </Link>

      {/* 중앙 네비게이션 */}
      <div className={styles.navItems}>
        <Link href={homeHref} className={`${styles.navItem} ${isHomePage ? styles.navItemActive : ''}`}>
          <HomeNavIcon active={isHomePage} />
          <span>홈 대시보드</span>
        </Link>
        <Link href={classesHref} className={`${styles.navItem} ${isClassesPage ? styles.navItemActive : ''}`}>
          <ClassNavIcon active={isClassesPage} />
          <span>내 클래스 관리</span>
        </Link>
        <Link href={reportHref} className={`${styles.navItem} ${isReportPage ? styles.navItemActive : ''}`}>
          <ReportNavIcon active={isReportPage} />
          <span>분석 리포트</span>
        </Link>
      </div>

      {/* 프로필 영역 */}
      <div className={styles.profileWrapper} ref={dropdownRef}>
        {!user ? (
          <Link href="/login" className={styles.loginSection}>
            <img src="/images/image_profile.png" alt="프로필" className={styles.avatarImage} />
            <span className={styles.loginText}>로그인을 해주세요</span>
          </Link>
        ) : (
          <>
            <button
              type="button"
              className={styles.profileSection}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <img src="/images/image_profile.png" alt="프로필" className={styles.avatarImage} />
              <span className={styles.userName}>{user.name} {roleTitle}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`}
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="#1A1A1A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {dropdownOpen && (
              <>
                <div className={styles.dropdownBackdrop} onClick={() => setDropdownOpen(false)} />
                <div className={styles.dropdown}>
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => { setDropdownOpen(false); setShowPasswordModal(true); }}
                  >
                    비밀번호 변경
                  </button>
                  <button type="button" className={styles.dropdownItem}>
                    알림
                  </button>
                  <div className={styles.dropdownDivider} />
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    onClick={() => { setDropdownOpen(false); onSignOut?.(); }}
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </nav>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
};
