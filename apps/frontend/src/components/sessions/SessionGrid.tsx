'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import { type ClassItem } from '@/actions/classes';
import { SessionModal } from './SessionModal';
import { ConfirmModal } from '../common/ConfirmModal';
import styles from './SessionGrid.module.css';
import type { CreateSessionBody } from '@/actions/sessions';
import { computeSessionStatus, type ComputedStatus } from '@/utils/sessionStatus';

const STATUS_CONFIG: Record<ComputedStatus, { label: string; badgeClass: string; iconColor: string; iconBg: string }> = {
  live:     { label: '진행중', badgeClass: 'badgeActive',  iconColor: 'var(--color-live)',              iconBg: 'var(--color-live-light)' },
  upcoming: { label: '예정',   badgeClass: 'badgePending', iconColor: '#ff922b',                        iconBg: '#fff4e6' },
  finished: { label: '종료',   badgeClass: 'badgeClosed',  iconColor: 'var(--color-text-secondary)',    iconBg: 'var(--color-border-light)' },
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

type Tab = '전체보기' | '세션 목록' | '과제 & 자료';

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
  const [activeTab, setActiveTab] = useState<Tab>('세션 목록');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = (id: number) => {
    setOpenMenuId(null);
    setDeleteTargetId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId === null) return;
    onDeleteSession(deleteTargetId);
    setDeleteTargetId(null);
  };

  const filtered = sessions.filter((s) =>
    s.session_name.includes(search) || (s.explanation ?? '').includes(search)
  );

  const classTitle = classInfo
    ? `${classInfo.grade ? `${classInfo.grade}학년 ` : ''}${classInfo.homeroom ?? ''}`
    : '';

  return (
    <div className={styles.mainContent}>
      <button className={styles.backLink} onClick={() => router.push('/t/classes')}>
        &lt; 클래스 목록으로
      </button>

      <div className={styles.classHeader}>
        <h1 className={styles.classTitle}>{classTitle || '—'}</h1>
        {classInfo?.subject && <span className={styles.tag}>{classInfo.subject}</span>}
      </div>

      <div className={styles.tabs}>
        {(['전체보기', '세션 목록', '과제 & 자료'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <option value="recent">최신순</option>
            <option value="name">이름순</option>
          </select>
          <button className={styles.createBtn} onClick={() => setIsCreateOpen(true)}>
            + 세션 만들기
          </button>
        </div>
      </div>

      <div className={styles.sessionList} ref={menuRef}>
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

              <span className={`${styles.badge} ${styles[cfg.badgeClass]}`}>{cfg.label}</span>

              <div className={styles.menuContainer}>
                <button
                  className={styles.moreBtn}
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
                    <button className={styles.menuItem} onClick={(e) => { e.stopPropagation(); router.push(`/t/classes/${classId}/sessions/${session.id}`); setOpenMenuId(null); }}>
                      상세보기
                    </button>
                    <button className={styles.menuItem} onClick={(e) => { e.stopPropagation(); setEditTarget(session); setOpenMenuId(null); }}>
                      정보 수정
                    </button>
                    <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isCreateOpen && (
        <SessionModal
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
