'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import { Users, Search, User, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { DropdownMenu } from '../common/DropdownMenu';
import { ChatModal } from '../reports/ChatModal';
import { getStudentSessionReport } from '@/actions/reports';
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

const STATUS_CONFIG: Record<ComputedStatus, { label: string; badgeClass: string }> = {
  live:     { label: '진행중',    badgeClass: 'badgeActive' },
  upcoming: { label: '임시 예정', badgeClass: 'badgePending' },
  finished: { label: '종료',      badgeClass: 'badgeClosed' },
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 0) {
    const futureDays = Math.floor(-diff / (1000 * 60 * 60 * 24));
    const futureHours = Math.floor(-diff / (1000 * 60 * 60));
    if (futureDays > 0) return `${futureDays}일 후`;
    if (futureHours > 0) return `${futureHours}시간 후`;
    return '곧';
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
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
  const [search, setSearch] = useState('');
  const [chatModal, setChatModal] = useState<{ dialogId: number; sessionName: string } | null>(null);
  const [reviewLoading, setReviewLoading] = useState<number | null>(null);

  const handleJoin = async (sessionId: number) => {
    setJoining(sessionId);
    try {
      await onJoinSession(sessionId);
    } catch (e) {
      alert(e instanceof Error ? e.message : '세션 참여에 실패했습니다.');
      setJoining(null);
    }
  };

  const handleReview = async (sessionId: number, sessionName: string) => {
    setReviewLoading(sessionId);
    try {
      const raw = await getStudentSessionReport(sessionId) as { dialog_id?: number } | null;
      const dialogId = raw?.dialog_id ?? null;
      if (dialogId) {
        setChatModal({ dialogId, sessionName });
      } else {
        alert('채팅 기록을 찾을 수 없습니다.');
      }
    } catch {
      alert('채팅 기록을 불러오는 데 실패했습니다.');
    } finally {
      setReviewLoading(null);
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
    <>
    <div className={styles.container}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={() => router.push('/s/classes')}>
          <ChevronLeft size={16} /> 클래스 목록으로
        </button>

        <div className={styles.classHeader}>
          <h1 className={styles.classTitle}>{classSubject}</h1>
          {classTag && (
            <div className={styles.teacherBadge}>
              <div className={styles.teacherAvatar}>
                <Image src="/images/profile_color.png" alt="프로필" width={28} height={28} />
              </div>
              <span className={styles.teacherName}>{classTag}</span>
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
                  finishedSessions.map((s) => (
                    <div key={s.id} className={styles.pastRow}>
                      <div className={styles.sessionIcon}>
                        <Image src="/images/sessionicon.png" alt="세션" width={30} height={30} />
                      </div>
                      <div className={styles.sessionInfo}>
                        <div className={styles.sessionTitle}>{s.session_name}</div>
                        <div className={styles.sessionSubject}>{s.explanation ?? ''}</div>
                      </div>
                      {s.period != null && (
                        <div className={styles.sessionMeta}>
                          <User size={20} color="#626664" strokeWidth={1.8} />
                          <span>{s.period}</span>
                        </div>
                      )}
                      <div className={styles.sessionTime}>
                        {formatRelativeTime(s.finished_at ?? s.scheduled_date)}
                      </div>
                      <button
                        className={styles.reviewBtn}
                        onClick={(e) => { e.stopPropagation(); handleReview(s.id, s.session_name); }}
                        disabled={reviewLoading === s.id}
                      >
                        {reviewLoading === s.id ? '불러오는 중...' : '복습하기'}
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

            <div className={styles.sessionList}>
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
                      <div className={styles.sessionIcon}>
                        <Image src="/images/sessionicon.png" alt="세션" width={30} height={30} />
                      </div>
                      <div className={styles.sessionInfo}>
                        <div className={styles.sessionTitle}>{session.session_name}</div>
                        <div className={styles.sessionSubject}>{session.explanation ?? ''}</div>
                      </div>

                      {session.period != null && (
                        <div className={styles.sessionMeta}>
                          <User size={20} color="#626664" strokeWidth={1.8} />
                          <span>{session.period}</span>
                        </div>
                      )}

                      <div className={styles.sessionTime}>
                        {formatRelativeTime(session.scheduled_date ?? session.scheduled_start)}
                      </div>

                      <span className={`${styles.badge} ${styles[cfg.badgeClass]}`}>
                        {cfg.label}
                      </span>

                      <div
                        className={styles.menuContainer}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu
                          trigger={
                            <button className={styles.moreBtn}>
                              <MoreHorizontal size={20} color="#626664" />
                            </button>
                          }
                          items={[
                            { label: '상세보기', onClick: () => router.push(`/s/classes/${classId}/sessions/${session.id}`) },
                          ]}
                        />
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

    {chatModal && (
      <ChatModal
        dialogId={chatModal.dialogId}
        sessionTitle={chatModal.sessionName}
        teacherName={classInfo?.users?.name ?? ''}
        onClose={() => setChatModal(null)}
      />
    )}
    </>
  );
};
