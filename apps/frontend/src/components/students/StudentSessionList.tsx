'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClass } from '@/actions/classes';
import styles from './StudentSessionList.module.css';

interface ClassInfo {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
}

type Tab = 'overview' | 'sessions' | 'materials';

const MOCK_PAST_SESSIONS = [
  { id: 1, date: '5월 13일 (월) 3교시', title: '영어 문법 – 관계대명사와 관계부사', students: 28, timeAgo: '1시간 전', grade: 'B' },
  { id: 2, date: '5월 13일 (월) 3교시', title: '영어 문법 – 관계대명사와 관계부사', students: 28, timeAgo: '1시간 전', grade: 'A*' },
  { id: 3, date: '5월 13일 (월) 3교시', title: '영어 문법 – 관계대명사와 관계부사', students: 28, timeAgo: '1시간 전', grade: 'A-' },
];

const MOCK_SESSION_LIST = [
  { id: 1, title: '5월 3일 영어 수업', subject: '수업 주제', students: 28, timeAgo: '1시간 전', status: 'ACTIVE' },
  { id: 2, title: '5월 3일 영어 수업', subject: '수업 주제', students: 28, timeAgo: '1시간 전', status: 'ACTIVE' },
  { id: 3, title: '5월 3일 영어 수업', subject: '수업 주제', students: 28, timeAgo: '1시간 전', status: 'PLANNING' },
  { id: 4, title: '5월 3일 영어 수업', subject: '수업 주제', students: 28, timeAgo: '1시간 전', status: 'PLANNING' },
  { id: 5, title: '5월 3일 영어 수업', subject: '수업 주제', students: 28, timeAgo: '1시간 전', status: 'PLANNING' },
  { id: 6, title: '5월 3일 영어 수업', subject: '수업 주제', students: 28, timeAgo: '1시간 전', status: 'COMPLETED' },
];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '진행중',
  PLANNING: '임시 예정',
  COMPLETED: '종료',
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: styles.badgeActive,
  PLANNING: styles.badgePlanning,
  COMPLETED: styles.badgeDone,
};

interface Props {
  classId: string;
  initialTab?: string;
}

export const StudentSessionList: React.FC<Props> = ({ classId, initialTab }) => {
  const router = useRouter();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    if (initialTab === 'sessions') return 'sessions';
    if (initialTab === 'materials') return 'materials';
    return 'overview';
  });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClass(classId)
      .then(setClassInfo)
      .catch(() => setClassInfo(null));
  }, [classId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const classTitle = classInfo
    ? classInfo.subject
    : '클래스';

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Back link */}
        <button className={styles.backBtn} onClick={() => router.push('/s/classes')}>
          ← 클래스 목록으로
        </button>

        {/* Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.classTitle}>{classTitle}</h1>
          <div className={styles.teacherBadge}>
            <span className={styles.teacherDot} />
            <span className={styles.teacherName}>박수빈 선생님</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'overview' ? styles.tabActive : ''}`}
            onClick={() => setTab('overview')}
          >
            전체보기
          </button>
          <button
            className={`${styles.tab} ${tab === 'sessions' ? styles.tabActive : ''}`}
            onClick={() => setTab('sessions')}
          >
            세션 목록
          </button>
          <button
            className={`${styles.tab} ${tab === 'materials' ? styles.tabActive : ''}`}
            onClick={() => setTab('materials')}
          >
            과제 &amp; 자료
          </button>
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className={styles.overviewContent}>
            {/* Live session banner */}
            <div className={styles.liveBanner}>
              <div className={styles.liveBannerLeft}>
                <div className={styles.liveBannerTop}>
                  <span className={styles.liveBadge}>LIVE</span>
                  <span className={styles.liveBannerLabel}>진행 중인 세션</span>
                </div>
                <div className={styles.liveBannerTitle}>영어 문법 – 관계대명사와 관계부사</div>
                <div className={styles.liveBannerDesc}>
                  오늘의 목표 : 관계 대명사가 필요한 문장을 이해하고 알맞은 관계대명사를 사용해 문장 완성하기
                </div>
              </div>
              <div className={styles.liveBannerActions}>
                <button
                  className={styles.joinSessionBtn}
                  onClick={() => router.push(`/s/classes/${classId}/sessions/1`)}
                >
                  세션 참여하기
                </button>
                <button className={styles.detailBtn}>자세히 보기</button>
              </div>
            </div>

            {/* Past sessions */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>지난 수업 복습</span>
                <button className={styles.viewAllBtn}>전체보기</button>
              </div>
              {MOCK_PAST_SESSIONS.map((s, idx) => (
                <div key={s.id} className={styles.pastRow}>
                  <span className={styles.pastNum}>{idx + 1}</span>
                  <div className={styles.pastInfo}>
                    <div className={styles.pastDate}>{s.date}</div>
                    <div className={styles.pastTitle}>{s.title}</div>
                  </div>
                  <span className={styles.pastStudents}>👥 {s.students}</span>
                  <span className={styles.pastTime}>{s.timeAgo}</span>
                  <span className={styles.pastGrade}>{s.grade}</span>
                  <button className={styles.reviewBtn}>복습하기</button>
                </div>
              ))}
            </div>

            {/* Materials */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>클래스 자료</div>
            </div>
          </div>
        )}

        {tab === 'sessions' && (
          <div className={styles.sessionsContent}>
            <div className={styles.sessionsFilterBar}>
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
                <option value="recent">최근순</option>
              </select>
            </div>

            <div className={styles.sessionList} ref={menuRef}>
              {MOCK_SESSION_LIST.filter((s) =>
                s.title.includes(search) || s.subject.includes(search)
              ).map((session) => (
                <div key={session.id} className={styles.sessionRow}>
                  <div className={styles.sessionIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionTitle}>{session.title}</div>
                    <div className={styles.sessionSubject}>{session.subject}</div>
                  </div>
                  <span className={styles.sessionStudents}>👥 {session.students}</span>
                  <span className={styles.sessionTime}>{session.timeAgo}</span>
                  <span className={`${styles.statusBadge} ${STATUS_CLASS[session.status]}`}>
                    {STATUS_LABEL[session.status]}
                  </span>
                  <div className={styles.menuWrapper}>
                    <button
                      className={styles.menuTrigger}
                      onClick={() => setOpenMenuId(openMenuId === session.id ? null : session.id)}
                    >
                      •••
                    </button>
                    {openMenuId === session.id && (
                      <div className={styles.dropdownMenu}>
                        <button
                          className={styles.menuItem}
                          onClick={() => { router.push(`/s/classes/${classId}/sessions/${session.id}`); setOpenMenuId(null); }}
                        >
                          상세보기
                        </button>
                        <button className={styles.menuItem} onClick={() => setOpenMenuId(null)}>
                          정보 수정
                        </button>
                        <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => setOpenMenuId(null)}>
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <button className={styles.pageBtn}>‹</button>
              {[1, 2, 3].map((p) => (
                <button key={p} className={`${styles.pageBtn} ${p === 1 ? styles.pageBtnActive : ''}`}>
                  {p}
                </button>
              ))}
              <button className={styles.pageBtn}>›</button>
            </div>
          </div>
        )}

        {tab === 'materials' && (
          <div className={styles.overviewContent}>
            <p className={styles.emptyText}>등록된 자료가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
