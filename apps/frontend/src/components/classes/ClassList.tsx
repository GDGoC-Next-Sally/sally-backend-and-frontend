'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from './CreateClassModal';
import { SessionCodeModal } from '../sessions/SessionCodeModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { FilterBar } from '../common/FilterBar';
import { ClassCard } from '../common/ClassCard';
import { DropdownMenu } from '../common/DropdownMenu';
import styles from './ClassList.module.css';
import type { CreateClassBody, ClassItem } from '@/actions/classes';

interface ClassListProps {
  classes: ClassItem[];
  onCreateClass: (data: CreateClassBody) => void;
  onUpdateClass: (id: number, data: Partial<CreateClassBody>) => void;
  onDeleteClass: (id: number) => void;
  onRefreshCode: (classId: number) => void;
  onToggleRegisterable: (classId: number) => void;
}

export const ClassList: React.FC<ClassListProps> = ({
  classes,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onRefreshCode,
  onToggleRegisterable,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [codeManageClass, setCodeManageClass] = useState<ClassItem | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<number | null>(null);

  const filtered = classes.filter((c) => {
    const label = `${c.grade ?? ''}학년 ${c.homeroom ?? ''} ${c.subject}`;
    return label.includes(search);
  });

  const handleDeleteConfirm = () => {
    if (deleteClassId === null) return;
    onDeleteClass(deleteClassId);
    setDeleteClassId(null);
  };

  return (
    <>
      <div className={styles.panel}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h2 className={styles.title}>클래스 목록</h2>
          <div className={styles.headerButtons}>
            <button className={styles.createBtn} onClick={() => setIsCreateModalOpen(true)}>
              클래스 만들기
            </button>
            <DropdownMenu
              trigger={
                <button className={styles.moreBtn}>더보기</button>
              }
              items={[
                { label: '분석 리포트', disabled: true },
              ]}
            />
          </div>
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
              title={`${cls.grade ? `${cls.grade}학년 ` : ''}${cls.homeroom ?? '미지정'}`}
              subtitle={`| ${cls.subject}`}
              schedule={cls.schedule}
              onNavigate={() => router.push(`/t/classes/${cls.id}`)}
              menuItems={[
                { label: '입장 코드 관리', onClick: () => setCodeManageClass(cls) },
                { label: '정보 수정', onClick: () => setEditClass(cls) },
                { label: '분석 리포트', disabled: true },
                { separator: true },
                { label: '삭제', danger: true, onClick: () => setDeleteClassId(cls.id) },
              ]}
            />
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>
              {search ? '검색 결과가 없습니다.' : '등록된 클래스가 없습니다.'}
            </div>
          )}
        </div>
      </div>

      {/* 모달들 */}
      <CreateClassModal
        open={isCreateModalOpen}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(body) => {
          onCreateClass(body);
          setIsCreateModalOpen(false);
        }}
      />
      <CreateClassModal
        key={editClass?.id ?? 'edit'}
        open={editClass !== null}
        mode="edit"
        classId={editClass?.id}
        initialData={editClass ? {
          subject: editClass.subject,
          grade: String(editClass.grade ?? 1),
          homeroom: editClass.homeroom ?? '',
          explanation: editClass.explanation ?? '',
          theme: ['slate', 'lavender', 'mint', 'peach', 'sky'].indexOf(editClass.theme ?? 'slate') < 0
            ? 0
            : ['slate', 'lavender', 'mint', 'peach', 'sky'].indexOf(editClass.theme ?? 'slate'),
          schedule: (() => {
            const s = editClass.schedule;
            if (!s) return [];
            if (Array.isArray(s)) return s;
            try { return JSON.parse(s as string); }
            catch { return []; }
          })(),
        } : undefined}
        onClose={() => setEditClass(null)}
        onSubmit={(body) => {
          if (editClass) onUpdateClass(editClass.id, body);
          setEditClass(null);
        }}
      />
      {codeManageClass && (
        <SessionCodeModal
          onClose={() => setCodeManageClass(null)}
          classId={codeManageClass.id}
          inviteCode={codeManageClass.invite_code}
          registerable={codeManageClass.registerable}
          onRefreshCode={() => onRefreshCode(codeManageClass.id)}
          onToggleRegisterable={() => onToggleRegisterable(codeManageClass.id)}
        />
      )}
      {deleteClassId !== null && (
        <ConfirmModal
          title="클래스를 삭제하시겠습니까?"
          description="삭제된 클래스는 복구할 수 없습니다."
          confirmLabel="삭제"
          onClose={() => setDeleteClassId(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
};
