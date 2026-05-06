'use client';

import React from 'react';
import styles from './SessionSidebar.module.css';
import type { AttendanceStudent } from '@/actions/sessions';

interface Props {
  phase: 'waiting' | 'active';
  students: AttendanceStudent[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onRefresh?: () => void;
}

export const SessionSidebar: React.FC<Props> = ({
  phase,
  students,
  selectedId,
  onSelect,
  onRefresh,
}) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          접속 중인 학생 <span className={styles.count}>{students.length}</span>
        </h2>
        <button className={styles.refreshBtn} type="button" onClick={onRefresh}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>

      {students.length === 0 ? (
        <p className={styles.empty}>아직 입장한 학생이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {students.map((student) => {
            const isSelected = phase === 'active' && student.userId === selectedId;
            return (
              <li
                key={student.userId}
                className={`${styles.item} ${isSelected ? styles.itemSelected : ''} ${phase === 'active' ? styles.itemClickable : ''}`}
                onClick={() => phase === 'active' && onSelect?.(student.userId)}
              >
                <div className={styles.itemHeader}>
                  <div className={styles.studentInfo}>
                    <span className={`${styles.dot} ${styles.dotOnline}`} />
                    <span className={styles.name}>{student.name}</span>
                  </div>
                  <button className={styles.moreBtn} type="button" onClick={(e) => e.stopPropagation()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                </div>
                <div className={styles.summary}>
                  입장 시간: {new Date(student.joinedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};
