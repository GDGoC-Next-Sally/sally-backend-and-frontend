'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import { JoinClassModal } from './JoinClassModal';
import styles from './StudentClassList.module.css';

interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  explanation: string | null;
  theme: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: styles.dotActive,
  PLANNING: styles.dotPlanning,
  COMPLETED: styles.dotDone,
};

const MOCK_FALLBACK_CLASSES: ClassItem[] = [
  { id: 1, subject: '영어 수업', grade: 3, homeroom: '2반', status: 'ACTIVE', explanation: null, theme: null },
  { id: 2, subject: '수학 수업', grade: 3, homeroom: '2반', status: 'PLANNING', explanation: null, theme: null },
  { id: 3, subject: '국어 수업', grade: 3, homeroom: '2반', status: 'ACTIVE', explanation: null, theme: null },
  { id: 4, subject: '한국사 수업', grade: 3, homeroom: '2반', status: 'COMPLETED', explanation: null, theme: null },
  { id: 5, subject: '통합과학 수업', grade: 3, homeroom: '2반', status: 'PLANNING', explanation: null, theme: null },
  { id: 6, subject: '통합사회 수업', grade: 3, homeroom: '2반', status: 'PLANNING', explanation: null, theme: null },
];

export const StudentClassList = () => {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    fetchWithAuth('/classes/student')
      .then((data) => setClasses(data.length > 0 ? data : MOCK_FALLBACK_CLASSES))
      .catch(() => setClasses(MOCK_FALLBACK_CLASSES));
  }, []);

  const filtered = classes.filter((c) =>
    `${c.subject} ${c.grade ?? ''} ${c.homeroom ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* Left: class card area */}
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <h2 className={styles.title}>과목 리스트</h2>
            <button className={styles.newBtn} onClick={() => setIsJoinModalOpen(true)}>
              새로운 과목
            </button>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
              <option value="recent">최근 활동순</option>
              <option value="name">이름순</option>
            </select>
          </div>

          <div className={styles.cardGrid}>
            {filtered.map((cls) => {
              const isSelected = cls.id === selectedId;
              return (
                <div
                  key={cls.id}
                  className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                  onClick={() => setSelectedId(isSelected ? null : cls.id)}
                >
                  <div className={styles.cardTopRow}>
                    <div className={styles.statusDotRow}>
                      <span className={`${styles.dot} ${STATUS_COLOR[cls.status] ?? ''}`} />
                    </div>
                  </div>
                  <div className={`${styles.cardTitle} ${isSelected ? styles.cardTitleSelected : ''}`}>
                    {cls.subject}
                  </div>
                  <div className={`${styles.cardTeacher} ${isSelected ? styles.cardTeacherSelected : ''}`}>
                    | {cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? '미지정'}
                  </div>
                  <button
                    className={`${styles.moveBtn} ${isSelected ? styles.moveBtnSelected : ''}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/s/classes/${cls.id}`); }}
                  >
                    과목 대기실로 이동&nbsp;→
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className={styles.empty}>
                {search ? '검색 결과가 없습니다.' : '수강 중인 클래스가 없습니다.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: connected students sidebar */}
        <div className={styles.rightPanel}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>
              접속 중인 학생 <span className={styles.sidebarCount}>34</span>
            </span>
            <button className={styles.refreshBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isJoinModalOpen && (
        <JoinClassModal
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={() => {
            setIsJoinModalOpen(false);
            fetchWithAuth('/classes/student').then(setClasses).catch(() => {});
          }}
        />
      )}
    </div>
  );
};
