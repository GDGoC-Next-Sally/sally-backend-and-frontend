'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookText, LayoutGrid, ChevronDown } from 'lucide-react';
import styles from './TopNav.module.css';
import { ChangePasswordModal } from './ChangePasswordModal';
import { DropdownMenu } from '../common/DropdownMenu';
import SallyLogo from '../icons/SallyLogo.jsx';
import ProfileIcon from '../icons/ProfileIcon.jsx';

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
  return <Home size={24} color={active ? '#22cb84' : '#1A1A1A'} />;
}

function ClassNavIcon({ active }: { active: boolean }) {
  return <BookText size={24} color={active ? '#22cb84' : '#1A1A1A'} />;
}

function ReportNavIcon({ active }: { active: boolean }) {
  return <LayoutGrid size={24} color={active ? '#22cb84' : '#1A1A1A'} />;
}

export const TopNav: React.FC<TopNavProps> = ({ user, onSignOut }) => {
  const pathname = usePathname();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
          <SallyLogo className={styles.logoImage} aria-label="Sally 로고" />
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
        <div className={styles.profileWrapper}>
          {!user ? (
            <Link href="/login" className={styles.loginSection}>
              <ProfileIcon className={styles.avatarImage} />
              <span className={styles.loginText}>로그인을 해주세요</span>
            </Link>
          ) : (
            <DropdownMenu
              trigger={
                <button type="button" className={styles.profileSection}>
                  <ProfileIcon className={styles.avatarImage} />
                  <span className={styles.userName}>{user.name} {roleTitle}</span>
                  <ChevronDown size={20} color="#1A1A1A" className={styles.chevron} />
                </button>
              }
              items={[
                { label: '비밀번호 변경', onClick: () => setShowPasswordModal(true) },
                { label: '알림', disabled: true },
                { separator: true },
                { label: '로그아웃', danger: true, onClick: () => onSignOut?.() },
              ]}
            />
          )}
        </div>
      </nav>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
};
