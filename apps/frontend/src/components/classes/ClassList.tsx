'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from './CreateClassModal';
import { SessionCodeModal } from '../sessions/SessionCodeModal';
import styles from './ClassList.module.css';
import type { CreateClassBody, ClassItem } from '@/actions/classes';

interface Student {
  id: number;
  name: string;
  progress: number;
  active: boolean;
  summary: string;
}

interface ClassListProps {
  classes: ClassItem[];
  students: Student[];
  onCreateClass: (data: CreateClassBody) => void;
  onUpdateClass: (id: number, data: Partial<CreateClassBody>) => void;
  onDeleteClass: (id: number) => void;
  onRefreshCode: (classId: number) => void;
  onToggleRegisterable: (classId: number) => void;
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: styles.dotActive,
  PLANNING: styles.dotPlanning,
  COMPLETED: styles.dotDone,
};

export const ClassList: React.FC<ClassListProps> = ({
  classes,
  students,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onRefreshCode,
  onToggleRegisterable,
}) => {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedClass = classes.find((c) => c.id === selectedId) ?? null;

  const enriched = classes.map((c) => ({
    ...c,
    schedule: c.schedule || '월1, 화4, 수4, 금4',
  }));

  const filtered = enriched.filter((c) => {
    const label = `${c.grade ?? ''}학년 ${c.homeroom ?? ''} ${c.subject}`;
    return label.includes(search);
  });

  const handleDelete = () => {
    if (!selectedId || !confirm('클래스를 삭제하시겠습니까?')) return;
    onDeleteClass(selectedId);
    setSelectedId(null);
    setShowDropdown(false);
  };

  const activeCount = students.filter((s) => s.active).length;

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* Left: class card area */}
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>클래스 목록</h2>
              <p className={styles.subtitle}>클래스를 선택해주세요.</p>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.btnCreate} onClick={() => setIsCreateModalOpen(true)}>
                클래스 만들기
              </button>
              <div className={styles.moreWrapper} ref={dropdownRef}>
                <button
                  className={`${styles.btnMore} ${selectedId ? styles.btnMoreActive : ''}`}
                  onClick={() => selectedId && setShowDropdown((v) => !v)}
                  disabled={!selectedId}
                >
                  더보기
                </button>
                {showDropdown && selectedClass && (
                  <div className={styles.dropdownMenu}>
                    <button
                      className={styles.menuItem}
                      onClick={() => { setIsCodeModalOpen(true); setShowDropdown(false); }}
                    >
                      입장 코드 관리
                    </button>
                    <button
                      className={styles.menuItem}
                      onClick={() => { setIsEditModalOpen(true); setShowDropdown(false); }}
                    >
                      정보 수정
                    </button>
                    <button className={`${styles.menuItem} ${styles.menuItemDisabled}`} disabled>
                      분석 리포트
                    </button>
                    <button
                      className={`${styles.menuItem} ${styles.menuItemDanger}`}
                      onClick={handleDelete}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.filterBar}>
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
              <option value="recent">최근 활동순</option>
              <option value="name">이름순</option>
            </select>
          </div>

          <div className={styles.cardGrid}>
            {filtered.map((cls) => {
              const isSelected = cls.id === selectedId;
              return (
                <div
                  key={cls.id}
                  className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                  onClick={() => setSelectedId(isSelected ? null : cls.id)}
                >
                  <div className={styles.cardSchedule}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {cls.schedule}
                  </div>
                  <div className={`${styles.cardTitle} ${isSelected ? styles.cardTitleSelected : ''}`}>
                    {cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? '미지정'}
                  </div>
                  <div className={`${styles.cardSubject} ${isSelected ? styles.cardSubjectSelected : ''}`}>
                    | {cls.subject}
                  </div>
                  <button
                    className={`${styles.moveBtn} ${isSelected ? styles.moveBtnSelected : ''}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/t/classes/${cls.id}`); }}
                  >
                    <span>과목 대기실로 이동</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className={styles.empty}>
                {search ? '검색 결과가 없습니다.' : '등록된 클래스가 없습니다.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: student sidebar — always visible */}
        <div className={styles.rightPanel}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>
              접속 중인 학생
              {selectedId !== null && (
                <span className={styles.sidebarCount}>&nbsp;{activeCount}</span>
              )}
            </span>
            <button className={styles.refreshBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>

          {selectedId === null ? (
            <p className={styles.sidebarEmpty}>
              클래스를 선택하면<br />접속 중인 학생이 표시됩니다.
            </p>
          ) : (
            <div className={styles.studentList}>
              {students.map((student) => (
                <div key={student.id} className={styles.studentCard}>
                  <div className={styles.studentTopRow}>
                    <div className={styles.studentAvatar} />
                    <span className={styles.studentName}>{student.name}</span>
                    <span className={styles.progressBadge}>진행률 {student.progress}%</span>
                    <button className={styles.studentMenuBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.studentSummary}>
                    {student.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateClassModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(body) => {
            onCreateClass(body);
            setIsCreateModalOpen(false);
          }}
        />
      )}
      {isEditModalOpen && selectedClass && (
        <CreateClassModal
          mode="edit"
          classId={selectedClass.id}
          initialData={{ subject: selectedClass.subject, theme: 0 }}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(body) => {
            if (selectedClass) onUpdateClass(selectedClass.id, body);
            setIsEditModalOpen(false);
          }}
        />
      )}
      {isCodeModalOpen && selectedClass && (
        <SessionCodeModal
          onClose={() => setIsCodeModalOpen(false)}
          classId={selectedClass.id}
          inviteCode={selectedClass.invite_code}
          registerable={selectedClass.registerable}
          onRefreshCode={() => onRefreshCode(selectedClass.id)}
          onToggleRegisterable={() => onToggleRegisterable(selectedClass.id)}
        />
      )}
    </div>
  );
};
