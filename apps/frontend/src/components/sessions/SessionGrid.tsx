'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type Session } from '@/actions/sessions';
import { type ClassItem, type ClassStudent, getClassStudents, kickStudent } from '@/actions/classes';
import { User, MoreHorizontal, ChevronLeft, Mail, Calendar } from 'lucide-react';
import { SessionModal } from './SessionModal';
import { CreateSessionModal } from './CreateSessionModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { DropdownMenu } from '../common/DropdownMenu';
import { FilterBar } from '../common/FilterBar';
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
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / (1000 * 60));
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const suffix = diff < 0 ? '후' : '전';
  if (minutes < 1) return diff < 0 ? '곧' : '방금 전';
  if (minutes < 60) return `${minutes}분 ${suffix}`;
  if (hours < 24) return `${hours}시간 ${suffix}`;
  return `${days}일 ${suffix}`;
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

type Tab = 'sessions' | 'students';

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
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [kickTargetName, setKickTargetName] = useState<string>('');

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const data = await getClassStudents(classId);
      setStudents(data);
    } catch {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
  }, [activeTab, fetchStudents]);

  const handleKickConfirm = async () => {
    if (!kickTargetId) return;
    try {
      await kickStudent(kickTargetId);
      setStudents((prev) => prev.filter((s) => s.id !== kickTargetId));
    } catch {
      alert('강퇴에 실패했습니다.');
    } finally {
      setKickTargetId(null);
      setKickTargetName('');
    }
  };

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
        <ChevronLeft size={16} /> 클래스 목록으로
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

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'sessions' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          세션
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('students')}
        >
          학생 목록
          {students.length > 0 && activeTab === 'students' && (
            <span className={styles.tabCount}>{students.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'sessions' && (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="세션 검색"
            sortOptions={[
              { value: 'recent', label: '최근순' },
              { value: 'name', label: '이름순' },
            ]}
          >
            <button className={styles.createBtn} onClick={() => setIsCreateOpen(true)}>
              + 세션 만들기
            </button>
          </FilterBar>

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
                  onClick={() =>
                    computed === 'finished'
                      ? router.push(`/t/reports?classId=${classId}&sessionId=${session.id}`)
                      : router.push(`/t/classes/${classId}/sessions/${session.id}`)
                  }
                >
                  <div className={styles.sessionIcon}>
                    <Image src="/images/sessionicon.png" alt="세션" width={30} height={30} />
                  </div>

                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionTitle}>{session.session_name}</div>
                    <div className={styles.sessionSubject}>{session.objective ?? ''}</div>
                  </div>

                  {session.period != null && (
                    <div className={styles.sessionMeta}>
                      <User size={20} color="#626664" strokeWidth={1.8} />
                      <span>{session.period}</span>
                    </div>
                  )}

                  <div className={styles.sessionTime}>
                    {formatRelativeTime(
                      computed === 'finished'
                        ? session.finished_at
                        : session.scheduled_start
                    )}
                  </div>

                  <span className={`${styles.badge} ${styles[cfg.badgeClass]}`}>{cfg.label}</span>

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
                        {
                          label: computed === 'finished' ? '리포트 보기' : '상세보기',
                          onClick: () => computed === 'finished'
                            ? router.push(`/t/reports?classId=${classId}&sessionId=${session.id}`)
                            : router.push(`/t/classes/${classId}/sessions/${session.id}`),
                        },
                        { label: '정보 수정', onClick: () => setEditTarget(session) },
                        { label: '삭제', danger: true, onClick: () => handleDelete(session.id) },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'students' && (
        <div className={styles.studentList}>
          {studentsLoading && (
            <div className={styles.empty}>학생 목록을 불러오는 중...</div>
          )}
          {!studentsLoading && students.length === 0 && (
            <div className={styles.empty}>등록된 학생이 없습니다.</div>
          )}
          {!studentsLoading && students.map((student) => (
            <div key={student.id} className={styles.studentRow}>
              <div className={styles.studentAvatar}>
                <Image src="/images/profile_color.png" alt="프로필" width={36} height={36} />
              </div>
              <div className={styles.studentInfo}>
                <div className={styles.studentName}>{student.name}</div>
                <div className={styles.studentMeta}>
                  <Mail size={12} color="#6B6B6B" />
                  <span>{student.email}</span>
                  <span className={styles.studentMetaDivider}>·</span>
                  <Calendar size={12} color="#6B6B6B" />
                  <span>{new Date(student.enrolled_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <button
                className={styles.kickBtn}
                onClick={() => { setKickTargetId(student.id); setKickTargetName(student.name); }}
              >
                강퇴
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateSessionModal
        open={isCreateOpen}
        classId={classId}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (body) => { await onCreateSession(body); onRefresh(); }}
      />
      <SessionModal
        open={!!editTarget}
        classId={classId}
        session={editTarget ?? { id: 0, session_name: '', class_id: classId } as Session}
        onClose={() => setEditTarget(null)}
        onSubmit={async (body) => { if (editTarget) await onUpdateSession(editTarget.id, body); onRefresh(); }}
      />
      {deleteTargetId !== null && (
        <ConfirmModal
          title="세션을 삭제하시겠습니까?"
          description="삭제된 세션은 복구할 수 없습니다."
          confirmLabel="삭제"
          onClose={() => setDeleteTargetId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {kickTargetId !== null && (
        <ConfirmModal
          title={`${kickTargetName} 학생을 강퇴하시겠습니까?`}
          description="강퇴된 학생은 클래스에서 제거됩니다."
          confirmLabel="강퇴"
          onClose={() => { setKickTargetId(null); setKickTargetName(''); }}
          onConfirm={handleKickConfirm}
        />
      )}
    </div>
  );
};
