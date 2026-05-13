'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import { Users, Search, MessageSquare, MoreHorizontal } from 'lucide-react';
import { computeSessionStatus, type ComputedStatus } from '@/utils/sessionStatus';
import styles from './StudentSessionList.module.css';

interface ClassInfo {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
  users?: {
    id: string;
    name: string;
  };
}

type Tab = 'overview' | 'sessions' | 'materials';

const STATUS_CONFIG: Record<ComputedStatus, { label: string; badgeClass: string; iconColor: string; iconBg: string }> = {
  live: { label: '진행중', badgeClass: styles.badgeActive, iconColor: '#0ca678', iconBg: '#e6fcf5' },
  upcoming: { label: '예정', badgeClass: styles.badgePlanning, iconColor: '#ff922b', iconBg: '#fff4e6' },
  finished: { label: '종료', badgeClass: styles.badgeDone, iconColor: '#868e96', iconBg: '#f1f3f5' },
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function getTimeAgo(dateStr?: string | null, fallbackStr?: string | null) {
  const targetDate = dateStr || fallbackStr;
  if (!targetDate) return '';
  const now = new Date();
  const past = new Date(targetDate);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
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
  const finishedSessions = sessions
    .filter((s) => computeSessionStatus(s) === 'finished')
    .sort((a, b) => {
      const aTime = new Date(a.finished_at || a.scheduled_date || 0).getTime();
      const bTime = new Date(b.finished_at || b.scheduled_date || 0).getTime();
      return bTime - aTime;
    });

  const classSubject = classInfo?.subject ?? '수업';
  const classTag = classInfo?.users?.name ? `${classInfo.users.name} 선생님` : '';

  const filteredSessions = sessions
    .filter((s) =>
      s.session_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.explanation ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const statusOrder = { live: 0, upcoming: 1, finished: 2 };
      const aOrder = statusOrder[computeSessionStatus(a)];
      const bOrder = statusOrder[computeSessionStatus(b)];
      if (aOrder !== bOrder) return aOrder - bOrder;

      const aDate = new Date(a.scheduled_date || 0).getTime();
      const bDate = new Date(b.scheduled_date || 0).getTime();
      return bDate - aDate;
    });

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => router.push('/s/classes')}>
          &lt; 클래스 목록으로
        </button>

        <div className={styles.pageHeader}>
          <h1 className={styles.classTitle}>{classSubject}</h1>
          {classTag && (
            <span className={styles.tag}>
              <span className={styles.tagDot} />
              {classTag}
            </span>
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
            {activeSession && (
              <div className={styles.liveBanner}>
                <div className={styles.liveBannerInfo}>
                  <div className={styles.liveBadgeRow}>
                    <span className={styles.liveBadge}>LIVE</span>
                    <span className={styles.liveStatusText}>진행 중인 세션</span>
                  </div>
                  <div className={styles.liveTitle}>{activeSession.session_name}</div>
                  <div className={styles.liveObjective}>
                    오늘의 목표 : {activeSession.objective || activeSession.explanation || '알맞은 문장 완성하기'}
                  </div>
                </div>
                <div className={styles.liveActions}>
                  <button
                    className={styles.joinBtn}
                    onClick={() => handleJoin(activeSession.id)}
                    disabled={joining === activeSession.id}
                  >
                    {joining === activeSession.id ? '참여 중...' : '세션 참여하기'}
                  </button>
                  <button
                    className={styles.detailBtn}
                    onClick={() => router.push(`/s/classes/${classId}/sessions/${activeSession.id}`)}
                  >
                    자세히 보기
                  </button>
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>지난 수업 복습</span>
                <span className={styles.viewAll} onClick={() => setTab('sessions')}>전체보기</span>
              </div>
              <div className={styles.pastList}>
                {finishedSessions.length === 0 ? (
                  <p className={styles.emptyText}>지난 세션이 없습니다.</p>
                ) : (
                  finishedSessions.map((s, idx) => (
                    <div key={s.id} className={styles.pastRow}>
                      <div className={styles.pastCircle}>{idx + 1}</div>
                      <div className={styles.pastInfo}>
                        <div className={styles.pastMeta}>
                          {formatDate(s.scheduled_date)} {s.period ? `${s.period}교시` : ''}
                        </div>
                        <div className={styles.pastTitle}>{s.session_name}</div>
                      </div>
                      <div className={styles.pastStats}>
                        <div className={styles.statItem}>
                          <Users size={14} />
                          완료
                        </div>
                      </div>
                      <div className={styles.timeAgo}>{getTimeAgo(s.finished_at, s.scheduled_date)}</div>
                      <button
                        className={styles.reviewBtn}
                        onClick={() => router.push(`/s/classes/${classId}/sessions/${s.id}`)}
                      >
                        복습하기
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'sessions' && (
          <div className={styles.sessionsContent}>
            <div className={styles.sessionsFilterBar}>
              <div className={styles.searchBox}>
                <Search className={styles.searchIcon} size={16} />
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
                        <MessageSquare size={18} color={cfg.iconColor} />
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
                          <MoreHorizontal size={18} />
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
