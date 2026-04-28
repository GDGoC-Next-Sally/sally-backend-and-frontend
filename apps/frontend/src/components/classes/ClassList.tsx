'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from './CreateClassModal';
import styles from './ClassList.module.css';

const MOCK_CLASSES = [
  { id: 1, name: '고려중학교 3학년 4반', studentCount: 28, lastActive: '1시간 전', status: 'active' },
  { id: 2, name: '고려중학교 3학년 4반', studentCount: 28, lastActive: '1시간 전', status: 'active' },
  { id: 3, name: '고려중학교 3학년 4반', studentCount: 28, lastActive: '1시간 전', status: 'active' },
  { id: 4, name: '고려중학교 3학년 4반', studentCount: 28, lastActive: '1시간 전', status: 'pending' },
  { id: 5, name: '고려중학교 3학년 4반', studentCount: 28, lastActive: '1시간 전', status: 'closed' },
  { id: 6, name: '고려중학교 3학년 4반', studentCount: 28, lastActive: '1시간 전', status: 'closed' },
];

export const ClassList = () => {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleMenu = (id: number) => {
    setActiveMenu(activeMenu === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className={`${styles.badge} ${styles.badgeActive}`}>진행중</span>;
      case 'pending':
        return <span className={`${styles.badge} ${styles.badgePending}`}>임시 예정</span>;
      case 'closed':
        return <span className={`${styles.badge} ${styles.badgeClosed}`}>종료</span>;
      default:
        return null;
    }
  };

  const navigateToDetail = (id: number) => {
    router.push(`/classes/${id}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleIcon}></div>
            <h2 className={styles.title}>내 클래스</h2>
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.btnSecondary} onClick={() => setIsModalOpen(true)}>클래스 만들기</button>
            <button className={styles.btnPrimary}>세션 시작하기</button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" className={styles.searchInput} placeholder="클래스 검색" />
          </div>
          <select className={styles.sortSelect} defaultValue="정렬">
            <option value="정렬" disabled hidden>정렬 ∨</option>
            <option value="recent">최근 활동순</option>
            <option value="name">이름순</option>
          </select>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>클래스 정보</th>
              <th className={styles.th}>학생 수</th>
              <th className={styles.th}>최근 활동</th>
              <th className={styles.th}>상태</th>
              <th className={styles.th}>관리</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CLASSES.map((cls) => (
              <tr key={cls.id} className={styles.tr}>
                <td className={styles.td} style={{ cursor: 'pointer' }} onClick={() => navigateToDetail(cls.id)}>
                  <div className={styles.classInfo}>
                    <div className={styles.classIcon}></div>
                    <span className={styles.className}>{cls.name}</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.studentCount}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    {cls.studentCount}
                  </div>
                </td>
                <td className={styles.td}>{cls.lastActive}</td>
                <td className={styles.td}>{getStatusBadge(cls.status)}</td>
                <td className={styles.td}>
                  <div className={styles.menuContainer}>
                    <button className={styles.moreBtn} onClick={() => toggleMenu(cls.id)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="19" cy="12" r="2"/>
                      </svg>
                    </button>
                    {activeMenu === cls.id && (
                      <div className={styles.dropdownMenu}>
                        <button className={styles.menuItem} onClick={() => navigateToDetail(cls.id)}>클래스 상세보기</button>
                        <button className={styles.menuItem}>세션 시작하기</button>
                        <button className={styles.menuItem}>정보 수정</button>
                        <button className={styles.menuItem}>입장 코드 관리</button>
                        <button className={`${styles.menuItem} ${styles.menuItemDanger}`}>삭제</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <button className={styles.pageBtn}>&lt;</button>
          <button className={`${styles.pageNumber} ${styles.activePage}`}>1</button>
          <button className={styles.pageNumber}>2</button>
          <button className={styles.pageNumber}>3</button>
          <button className={styles.pageBtn}>&gt;</button>
        </div>
      </div>

      {isModalOpen && <CreateClassModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
