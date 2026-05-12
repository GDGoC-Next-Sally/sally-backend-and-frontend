'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import { computeSessionStatus, type ComputedStatus } from '@/utils/sessionStatus';
import styles from './StudentSessionList.module.css';

interface ClassInfo {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
}

type Tab = 'overview' | 'sessions' | 'materials';

const STATUS_CONFIG: Record<ComputedStatus, { label: string; badgeClass: string; iconColor: string; iconBg: string }> = {
  live:     { label: '진행중', badgeClass: styles.badgeActive,   iconColor: 'var(--color-live)',              iconBg: 'var(--color-live-light)' },
  upcoming: { label: '예정',   badgeClass: styles.badgePlanning, iconColor: '#ff922b',                        iconBg: '#fff4e6' },
  finished: { label: '종료',   badgeClass: styles.badgeDone,     iconColor: 'var(--color-text-secondary)',    iconBg: 'var(--color-border-light)' },
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    .toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

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

  const activeSession = sessions.find((s) => computeSessionStatus(s) === 'live');
  const upcomingSessions = sessions.filter((s) => computeSessionStatus(s) === 'upcoming');
  const finishedSessions = sessions.filter((s) => computeSessionStatus(s) === 'finished');
  const displayTitle = classInfo
    ? `${classInfo.grade ? `${classInfo.grade}학년 ` : ''}${classInfo.homeroom ?? ''}`
    : '';

  const filteredSessions = sessions.filter((s) =>
    s.session_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.explanation ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => router.push('/s/classes')}>
          &lt; 클래스 목록으로
        </button>

        <div className={styles.pageHeader}>
          <h1 className={styles.classTitle}>{displayTitle || '—'}</h1>
          {classInfo?.subject && <span className={styles.tag}>{classInfo.subject}</span>}
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

        {(tab === 'overview' || tab === 'sessions') && (
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
                filteredSessions.map((session) => {
                  const computed = computeSessionStatus(session);
                  const cfg = STATUS_CONFIG[computed];
                  return (
                    <div
                      key={session.id}
                      className={styles.sessionRow}
                      onClick={() => router.push(`/s/classes/${classId}/sessions/${session.id}`)}
                    >
                      <div className={styles.sessionIcon} style={{ backgroundColor: cfg.iconBg }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cfg.iconColor} strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div className={styles.sessionInfo}>
                        <div className={styles.sessionTitle}>{session.session_name}</div>
                        <div className={styles.sessionSubject}>{session.explanation ?? ''}</div>
                      </div>

                      {session.period && (
                        <div className={styles.sessionMeta}>{session.period}교시</div>
                      )}

                      <div className={styles.sessionTime}>{formatDate(session.scheduled_date)}</div>

                      <span className={`${styles.statusBadge} ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                      <div className={styles.menuWrapper}>
                        <button
                          className={styles.menuTrigger}
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
                                router.push(`/s/classes/${classId}/sessions/${session.id}`);
                                setOpenMenuId(null);
                              }}
                            >
                              상세보기
                            </button>
                            {computed === 'live' && (
                              <button
                                className={styles.menuItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoin(session.id);
                                  setOpenMenuId(null);
                                }}
                                disabled={joining === session.id}
                              >
                                {joining === session.id ? '참여 중...' : '세션 참여하기'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
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
