'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './SessionGrid.module.css';

const MOCK_SESSIONS = [
  { id: 1, status: 'active', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
  { id: 2, status: 'pending', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
  { id: 3, status: 'pending', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
  { id: 4, status: 'pending', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
  { id: 5, status: 'pending', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
  { id: 6, status: 'closed', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
  { id: 7, status: 'closed', time: '수요일 5교시', week: '4월 1주차', title: '영어 수업' },
];

export const SessionGrid = () => {
  const params = useParams();
  const classId = params.id as string;

  return (
    <div className={styles.mainContent}>
      <div className={styles.header}>
        <h1 className={styles.title}>고려중학교 3학년 4반</h1>
        <button className={styles.btnPrimary}>신규 세션 생성</button>
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
          <option value="recent">최신순</option>
          <option value="name">이름순</option>
        </select>
      </div>

      <div className={styles.grid}>
        {MOCK_SESSIONS.map((session) => (
          <Link href={`/classes/${classId}/sessions/${session.id}`} key={session.id} className={styles.cardLink}>
            <div className={`${styles.card} ${session.status === 'active' ? styles.cardActive : ''}`}>
              {session.status === 'active' && (
                <svg className={styles.starIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              )}
              
              <div className={styles.cardTop}>
                {session.status === 'active' && <span className={`${styles.badge} ${styles.badgeActive}`}>진행 중</span>}
                {session.status === 'pending' && <span className={`${styles.badge} ${styles.badgePending}`}>시작 대기</span>}
                {session.status === 'closed' && <span className={`${styles.badge} ${styles.badgeClosed}`}>종료</span>}
                
                <span className={styles.timeText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {session.time}
                </span>
              </div>

              <div className={styles.weekText}>{session.week}</div>
              <h3 className={styles.cardTitle}>{session.title}</h3>

              {session.status === 'active' && (
                <div className={`${styles.bottomBtn} ${styles.bottomBtnActive}`}>실시간 관찰 및 코칭 &gt;</div>
              )}
              {session.status === 'pending' && (
                <div className={styles.bottomBtn}>준비하기 &gt;</div>
              )}
              {session.status === 'closed' && (
                <div className={styles.bottomBtn}>리포트 보기 &gt;</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
