'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './SessionGrid.module.css';

interface Session {
  id: number;
  status: 'active' | 'pending' | 'closed';
  title: string;
  subject: string;
  studentCount: number;
  timeAgo: string;
}

const MOCK_SESSIONS: Session[] = [
  { id: 1, status: 'active',  title: '5월 3일 영어 수업', subject: '수업 주제', studentCount: 28, timeAgo: '1시간 전' },
  { id: 2, status: 'active',  title: '5월 3일 영어 수업', subject: '수업 주제', studentCount: 28, timeAgo: '1시간 전' },
  { id: 3, status: 'pending', title: '5월 3일 영어 수업', subject: '수업 주제', studentCount: 28, timeAgo: '1시간 전' },
  { id: 4, status: 'pending', title: '5월 3일 영어 수업', subject: '수업 주제', studentCount: 28, timeAgo: '1시간 전' },
  { id: 5, status: 'pending', title: '5월 3일 영어 수업', subject: '수업 주제', studentCount: 28, timeAgo: '1시간 전' },
  { id: 6, status: 'closed',  title: '5월 3일 영어 수업', subject: '수업 주제', studentCount: 28, timeAgo: '1시간 전' },
];

const STATUS_CONFIG = {
  active:  { label: '진행중',  className: 'badgeActive' },
  pending: { label: '임시 예정', className: 'badgePending' },
  closed:  { label: '종료',    className: 'badgeClosed' },
};

type Tab = '전체보기' | '세션 목록' | '과제 & 자료';

export const SessionGrid = () => {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('세션 목록');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = MOCK_SESSIONS.filter((s) =>
    s.title.includes(search) || s.subject.includes(search)
  );

  return (
    <div className={styles.mainContent}>
      {/* Back link + class info */}
      <button className={styles.backLink} onClick={() => router.push('/classes')}>
        &lt; 클래스 목록으로
      </button>

      <div className={styles.classHeader}>
        <h1 className={styles.classTitle}>3학년 4반</h1>
        <span className={styles.tag}>중동 영어</span>
        <span className={styles.tag}>2026 1학기</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['전체보기', '세션 목록', '과제 & 자료'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="클래스 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.sortSelect} defaultValue="">
          <option value="" disabled>정렬</option>
          <option value="recent">최신순</option>
          <option value="name">이름순</option>
        </select>
      </div>

      {/* Session list */}
      <div className={styles.sessionList} ref={menuRef}>
        {filtered.map((session) => {
          const cfg = STATUS_CONFIG[session.status];
          return (
            <div
              key={session.id}
              className={styles.sessionRow}
              onClick={() => router.push(`/classes/${classId}/sessions/${session.id}`)}
            >
              {/* Icon */}
              <div className={styles.sessionIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#20c997" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              {/* Title + subject */}
              <div className={styles.sessionInfo}>
                <div className={styles.sessionTitle}>{session.title}</div>
                <div className={styles.sessionSubject}>{session.subject}</div>
              </div>

              {/* Student count */}
              <div className={styles.sessionMeta}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#adb5bd">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                {session.studentCount}
              </div>

              {/* Time */}
              <div className={styles.sessionTime}>{session.timeAgo}</div>

              {/* Status badge */}
              <span className={`${styles.badge} ${styles[cfg.className]}`}>{cfg.label}</span>

              {/* Three-dot menu */}
              <div className={styles.menuContainer}>
                <button
                  className={styles.moreBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === session.id ? null : session.id);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
                {openMenuId === session.id && (
                  <div className={styles.dropdownMenu}>
                    <button
                      className={styles.menuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/classes/${classId}/sessions/${session.id}`);
                        setOpenMenuId(null);
                      }}
                    >
                      상세보기
                    </button>
                    <button className={styles.menuItem} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}>
                      정보 수정
                    </button>
                    <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <button className={styles.pageBtn}>&lt;</button>
        <button className={`${styles.pageNumber} ${styles.pageActive}`}>1</button>
        <button className={styles.pageNumber}>2</button>
        <button className={styles.pageNumber}>3</button>
        <button className={styles.pageBtn}>&gt;</button>
      </div>
    </div>
  );
};
