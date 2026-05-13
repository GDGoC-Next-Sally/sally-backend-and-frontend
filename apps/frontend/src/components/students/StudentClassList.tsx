'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JoinClassModal } from './JoinClassModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { FilterBar } from '../common/FilterBar';
import { ClassCard } from '../common/ClassCard';
import styles from './StudentClassList.module.css';

interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  explanation: string | null;
  theme: string | null;
  schedule?: string | null;
  teacher?: string;
}

interface StudentClassListProps {
  classes: ClassItem[];
  onLeaveClass: (classId: number) => void;
  onRefresh: () => void;
}

export const StudentClassList: React.FC<StudentClassListProps> = ({
  classes,
  onLeaveClass,
  onRefresh,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [pendingLeaveId, setPendingLeaveId] = useState<number | null>(null);

  const handleLeaveConfirm = () => {
    if (pendingLeaveId === null) return;
    onLeaveClass(pendingLeaveId);
    setPendingLeaveId(null);
    onRefresh();
  };

  const filtered = classes.filter((c) =>
    `${c.subject} ${c.grade ?? ''} ${c.homeroom ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  /** 학년 + 반 + 과목을 하나의 타이틀로 합침 (피그마 기준) */
  const formatTitle = (c: ClassItem) =>
    [c.grade ? `${c.grade}학년` : '', c.homeroom ?? '', c.subject].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h2 className={styles.title}>클래스 목록</h2>
          <button className={styles.addBtn} onClick={() => setIsJoinModalOpen(true)}>
            클래스 추가하기
          </button>
        </div>

        <div className={styles.divider} />

        {/* 검색 + 정렬 */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="클래스 검색"
        />

        {/* 카드 그리드 */}
        <div className={styles.cardGrid}>
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              title={formatTitle(cls)}
              subtitle={cls.teacher ? `| ${cls.teacher} 선생님` : undefined}
              schedule={cls.schedule}
              onNavigate={() => router.push(`/s/classes/${cls.id}`)}
              menuItems={[
                {
                  label: '클래스 나가기',
                  danger: true,
                  onClick: () => setPendingLeaveId(cls.id),
                },
              ]}
            />
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>
              {search
                ? '검색 결과가 없습니다.'
                : '수강 중인 클래스가 없습니다.\n클래스 추가하기 버튼으로 참여해보세요.'}
            </div>
          )}
        </div>
      </div>

      {isJoinModalOpen && (
        <JoinClassModal
          onClose={() => setIsJoinModalOpen(false)}
          onJoin={async (inviteCode) => {
            const { joinClass } = await import('@/actions/classes');
            await joinClass(inviteCode);
            setIsJoinModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {pendingLeaveId !== null && (
        <ConfirmModal
          title="이 클래스에서 나가시겠습니까?"
          description="나가면 해당 클래스의 수업에 참여할 수 없습니다."
          cancelLabel="취소"
          confirmLabel="나가기"
          onClose={() => setPendingLeaveId(null)}
          onConfirm={handleLeaveConfirm}
        />
      )}
    </div>
  );
};
