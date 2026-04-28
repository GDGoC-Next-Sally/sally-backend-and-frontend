'use client';

import React from 'react';
import styles from './StudentSidebar.module.css';

const MOCK_STUDENTS = [
  { id: 1, name: '김학생', progress: 40, active: false, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약학생별 개별 성취도 요약\n학생별 개별 성취도 요약학생별 개별 성취도 요약학생별 개별 성취도 요약' },
  { id: 2, name: '김학생', progress: 40, active: true, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약학생별 개별 성취도 요약\n학생별 개별 성취도 요약학생별 개별 성취도 요약학생별 개별 성취도 요약' },
  { id: 3, name: '김학생', progress: 40, active: true, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약학생별 개별 성취도 요약\n학생별 개별 성취도 요약학생별 개별 성취도 요약학생별 개별 성취도 요약' },
  { id: 4, name: '김학생', progress: 40, active: false, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약학생별 개별 성취도 요약\n학생별 개별 성취도 요약학생별 개별 성취도 요약학생별 개별 성취도 요약' },
  { id: 5, name: '김학생', progress: 40, active: true, summary: '학생별 개별 성취도 요약 학생별 개별 성취도 요약학생별 개별 성취도 요약\n학생별 개별 성취도 요약학생별 개별 성취도 요약학생별 개별 성취도 요약' },
];

export const StudentSidebar = () => {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>접속 중인 학생 <span className={styles.count}>34</span></h2>
        <button className={styles.refreshBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
      </div>

      <div className={styles.studentList}>
        {MOCK_STUDENTS.map(student => (
          <div key={student.id} className={styles.studentItem}>
            <div className={styles.studentHeader}>
              <div className={styles.studentInfo}>
                <div className={`${styles.avatar} ${student.active ? styles.avatarActive : ''}`}></div>
                <span className={styles.name}>{student.name}</span>
                <span className={styles.progressBadge}>진행률 {student.progress}%</span>
              </div>
              <button className={styles.moreBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="12" r="2"/>
                </svg>
              </button>
            </div>
            <div className={styles.summaryBox}>
              {student.summary.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
