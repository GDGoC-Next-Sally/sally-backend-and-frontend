'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import { type ClassItem } from '@/actions/classes';
import { SessionModal } from './SessionModal';
import { CreateSessionModal } from './CreateSessionModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { DropdownMenu } from '../common/DropdownMenu';
import styles from './SessionGrid.module.css';
import type { CreateSessionBody } from '@/actions/sessions';
import { computeSessionStatus, type ComputedStatus } from '@/utils/sessionStatus';

const STATUS_CONFIG: Record<ComputedStatus, { label: string; badgeClass: string; iconColor: string; iconBg: string }> = {
  live:     { label: '진행중',    badgeClass: 'badgeActive',  iconColor: '#22cb84', iconBg: '#f5faf8' },
  upcoming: { label: '임시 예정', badgeClass: 'badgePending', iconColor: '#e3aa00', iconBg: '#f5faf8' },
  finished: { label: '종료',      badgeClass: 'badgeClosed',  iconColor: '#adb5bd', iconBg: '#f5faf8' },
};

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

interface SessionGridProps {
  classId: number;
  classInfo: ClassItem | null;
  sessions: Session[];
  onDeleteSession: (id: number) => void;
  onCreateSession: (body: CreateSessionBody) => void;
  onUpdateSession: (sessionId: number, body: CreateSessionBody) => void;
  onRefresh: () => void;
}

export const SessionGrid: React.FC<SessionGridProps> = ({
  classId,
  classInfo,
  sessions,
  onDeleteSession,
  onCreateSession,
  onUpdateSession,
  onRefresh,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId === null) return;
    onDeleteSession(deleteTargetId);
    setDeleteTargetId(null);
  };

  const filtered = sessions
    .filter((s) =>
      s.session_name.includes(search) || (s.explanation ?? '').includes(search)
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

  const classTitle = classInfo
    ? `${classInfo.grade ? `${classInfo.grade}학년 ` : ''}${classInfo.homeroom ?? ''}`
    : '';

  const teacherName = classInfo?.users?.name;

  return (
    <div className={styles.mainContent}>
      <button className={styles.backLink} onClick={() => router.push('/t/classes')}>
        &lt; 클래스 목록으로
      </button>

      <div className={styles.classHeader}>
        <h1 className={styles.classTitle}>{classTitle || '—'}</h1>
        {teacherName && (
          <div className={styles.teacherBadge}>
            <div className={styles.teacherAvatar}>
              <Image src="/images/profile_color.png" alt="프로필" width={28} height={28} />
            </div>
            <span className={styles.teacherName}>{teacherName} 선생님</span>
          </div>
        )}
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="세션 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select className={styles.sortSelect} defaultValue="">
            <option value="" disabled>정렬</option>
            <option value="recent">최근순</option>
            <option value="name">이름순</option>
          </select>
          <button className={styles.createBtn} onClick={() => setIsCreateOpen(true)}>
            + 세션 만들기
          </button>
        </div>
      </div>

      <div className={styles.sessionList}>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            {search ? '검색 결과가 없습니다.' : '등록된 세션이 없습니다.'}
          </div>
        )}
        {filtered.map((session) => {
          const computed = computeSessionStatus(session);
          const cfg = STATUS_CONFIG[computed];
          return (
            <div
              key={session.id}
              className={styles.sessionRow}
              onClick={() => router.push(`/t/classes/${classId}/sessions/${session.id}`)}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#626664" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{session.period}</span>
                </div>
              )}

              <div className={styles.sessionTime}>
                {formatRelativeTime(session.scheduled_date ?? session.scheduled_start)}
              </div>

              <span className={`${styles.badge} ${styles[cfg.badgeClass]}`}>{cfg.label}</span>

              <div
                className={styles.menuContainer}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu
                  trigger={
                    <button className={styles.moreBtn}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#626664">
                        <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  }
                  items={[
                    { label: '상세보기', onClick: () => router.push(`/t/classes/${classId}/sessions/${session.id}`) },
                    { label: '정보 수정', onClick: () => setEditTarget(session) },
                    { label: '삭제', danger: true, onClick: () => handleDelete(session.id) },
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isCreateOpen && (
        <CreateSessionModal
          classId={classId}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (body) => { await onCreateSession(body); onRefresh(); }}
        />
      )}
      {editTarget && (
        <SessionModal
          classId={classId}
          session={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (body) => { if (editTarget) await onUpdateSession(editTarget.id, body); onRefresh(); }}
        />
      )}
      {deleteTargetId !== null && (
        <ConfirmModal
          title="세션을 삭제하시겠습니까?"
          description="삭제된 세션은 복구할 수 없습니다."
          confirmLabel="삭제"
          onClose={() => setDeleteTargetId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};
