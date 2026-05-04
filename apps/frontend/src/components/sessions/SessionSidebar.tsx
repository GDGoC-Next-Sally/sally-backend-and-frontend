'use client';

import React from 'react';
import styles from './SessionSidebar.module.css';

export interface Student {
  id: number;
  name: string;
  progress: number;
  online: boolean;
  summary: string;
}

const MOCK_STUDENTS: Student[] = [
  { id: 1, name: '김학생', progress: 40, online: false, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약 학생별 개별 성취도 요약' },
  { id: 2, name: '김학생', progress: 40, online: true,  summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약 학생별 개별 성취도 요약' },
  { id: 3, name: '김학생', progress: 40, online: true,  summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약 학생별 개별 성취도 요약' },
  { id: 4, name: '김학생', progress: 40, online: false, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약 학생별 개별 성취도 요약' },
  { id: 5, name: '김학생', progress: 40, online: true,  summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약 학생별 개별 성취도 요약' },
];

interface Props {
  phase: 'waiting' | 'active';
  selectedId?: number;
  onSelect?: (id: number) => void;
}

export const SessionSidebar: React.FC<Props> = ({ phase, selectedId, onSelect }) => {
  const onlineCount = MOCK_STUDENTS.filter((s) => s.online).length;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          접속 중인 학생 <span className={styles.count}>{onlineCount}</span>
        </h2>
        <button className={styles.refreshBtn} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>

      <ul className={styles.list}>
        {MOCK_STUDENTS.map((student) => {
          const isSelected = phase === 'active' && student.id === selectedId;
          return (
            <li
              key={student.id}
              className={`${styles.item} ${isSelected ? styles.itemSelected : ''} ${phase === 'active' ? styles.itemClickable : ''}`}
              onClick={() => phase === 'active' && onSelect?.(student.id)}
            >
              <div className={styles.itemHeader}>
                <div className={styles.studentInfo}>
                  <span className={`${styles.dot} ${student.online ? styles.dotOnline : ''}`} />
                  <span className={styles.name}>{student.name}</span>
                  <span className={styles.badge}>진행률 {student.progress}%</span>
                </div>
                <button className={styles.moreBtn} type="button" onClick={(e) => e.stopPropagation()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              </div>
              <div className={styles.summary}>{student.summary}</div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
