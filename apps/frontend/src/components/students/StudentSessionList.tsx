'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import styles from './StudentSessionList.module.css';

interface ClassInfo {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
}

type Tab = 'overview' | 'sessions' | 'materials';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '진행중',
  PLANNING: '준비중',
  FINISHED: '종료',
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: styles.badgeActive,
  PLANNING: styles.badgePlanning,
  FINISHED: styles.badgeDone,
};

interface Props {
  classId: string;
  classInfo: ClassInfo | null;
  sessions: Session[];
  onJoinSession: (sessionId: number) => Promise<void>;
  initialTab?: string;
}

export const StudentSessionList: React.FC<Props> = ({
  classId,
  classInfo,
  sessions,
  onJoinSession,
  initialTab,
}) => {
  const router = useRouter();
  const [joining, setJoining] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    if (initialTab === 'sessions') return 'sessions';
    if (initialTab === 'materials') return 'materials';
    return 'overview';
  });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const handleJoin = async (sessionId: number) => {
    setJoining(sessionId);
    try {
      await onJoinSession(sessionId);
    } catch (e) {
      alert(e instanceof Error ? e.message : '세션 참여에 실패했습니다.');
      setJoining(null);
    }
  };

  const activeSession = sessions.find((s) => s.status === 'ACTIVE');
  const finishedSessions = sessions.filter((s) => s.status === 'FINISHED');
  const classTitle = classInfo?.subject ?? '클래스';

  const filteredSessions = sessions.filter((s) =>
    s.session_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.explanation ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => router.push('/s/classes')}>
          ← 클래스 목록으로
        </button>

        <div className={styles.pageHeader}>
          <h1 className={styles.classTitle}>{classTitle}</h1>
          {classInfo?.grade && (
            <div className={styles.teacherBadge}>
              <span className={styles.teacherDot} />
              <span className={styles.teacherName}>{classInfo.grade}학년 {classInfo.homeroom ?? ''}</span>
            </div>
          )}
        </div>

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

        {tab === 'overview' && (
          <div className={styles.overviewContent}>
            {activeSession ? (
              <div className={styles.liveBanner}>
                <div className={styles.liveBannerLeft}>
                  <div className={styles.liveBannerTop}>
                    <span className={styles.liveBadge}>LIVE</span>
                    <span className={styles.liveBannerLabel}>진행 중인 세션</span>
                  </div>
                  <div className={styles.liveBannerTitle}>{activeSession.session_name}</div>
                  {activeSession.objective && (
                    <div className={styles.liveBannerDesc}>
                      오늘의 목표 : {activeSession.objective}
                    </div>
                  )}
                </div>
                <div className={styles.liveBannerActions}>
                  <button
                    className={styles.joinSessionBtn}
                    onClick={() => handleJoin(activeSession.id)}
                    disabled={joining === activeSession.id}
                  >
                    {joining === activeSession.id ? '참여 중...' : '세션 참여하기'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.noLiveBanner}>
                <span>현재 진행 중인 세션이 없습니다.</span>
              </div>
            )}

            {finishedSessions.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>지난 수업 복습</span>
                  <button className={styles.viewAllBtn} onClick={() => setTab('sessions')}>
                    전체보기
                  </button>
                </div>
                {finishedSessions.slice(0, 3).map((s, idx) => (
                  <div key={s.id} className={styles.pastRow}>
                    <span className={styles.pastNum}>{idx + 1}</span>
                    <div className={styles.pastInfo}>
                      {s.scheduled_date && (
                        <div className={styles.pastDate}>{s.scheduled_date}</div>
                      )}
                      <div className={styles.pastTitle}>{s.session_name}</div>
                    </div>
                    <button
                      className={styles.reviewBtn}
                      onClick={() => router.push(`/s/classes/${classId}/sessions/${s.id}`)}
                    >
                      복습하기
                    </button>
                  </div>
                ))}
              </div>
            )}

            {finishedSessions.length === 0 && !activeSession && (
              <p className={styles.emptyText}>등록된 세션이 없습니다.</p>
            )}
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
                  placeholder="세션 검색"
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
              {filteredSessions.length === 0 ? (
                <p className={styles.emptyText}>
                  {search ? '검색 결과가 없습니다.' : '등록된 세션이 없습니다.'}
                </p>
              ) : (
                filteredSessions.map((session) => (
                  <div key={session.id} className={styles.sessionRow}>
                    <div className={styles.sessionIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionTitle}>{session.session_name}</div>
                      {session.explanation && (
                        <div className={styles.sessionSubject}>{session.explanation}</div>
                      )}
                    </div>
                    {session.scheduled_date && (
                      <span className={styles.sessionTime}>{session.scheduled_date}</span>
                    )}
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[session.status] ?? ''}`}>
                      {STATUS_LABEL[session.status] ?? session.status}
                    </span>
                    {session.status === 'ACTIVE' && (
                      <button
                        className={styles.joinSessionBtn}
                        onClick={() => handleJoin(session.id)}
                        disabled={joining === session.id}
                      >
                        {joining === session.id ? '참여 중...' : '참여하기'}
                      </button>
                    )}
                    {session.status !== 'ACTIVE' && (
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
                              onClick={() => {
                                router.push(`/s/classes/${classId}/sessions/${session.id}`);
                                setOpenMenuId(null);
                              }}
                            >
                              상세보기
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
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
