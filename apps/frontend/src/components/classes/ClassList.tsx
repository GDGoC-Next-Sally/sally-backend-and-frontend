'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from './CreateClassModal';
import { SessionCodeModal } from '../sessions/SessionCodeModal';
import { StudentSidebar } from '../students/StudentSidebar';
import { fetchWithAuth } from '@/lib/api';
import styles from './ClassList.module.css';

interface ClassItem {
  id: number;
  invite_code: string;
  registerable: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  grade: number | null;
  homeroom: string | null;
  subject: string;
  explanation: string | null;
  theme: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '진행중',
  PLANNING: '예정',
  COMPLETED: '종료',
};

export const ClassList = () => {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchClasses = () => {
    fetchWithAuth('/classes/teacher')
      .then((data) => setClasses(data))
      .catch(() => setClasses([]));
  };

  useEffect(() => { fetchClasses(); }, []);

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

  const filtered = classes.filter((c) => {
    const label = `${c.grade ?? ''}학년 ${c.homeroom ?? ''} ${c.subject}`;
    return label.includes(search);
  });

  const handleDelete = async () => {
    if (!selectedId || !confirm('클래스를 삭제하시겠습니까?')) return;
    try {
      await fetchWithAuth(`/classes/${selectedId}`, { method: 'DELETE' });
      setClasses((prev) => prev.filter((c) => c.id !== selectedId));
      setSelectedId(null);
    } catch {
      alert('삭제에 실패했습니다.');
    }
    setShowDropdown(false);
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.layout} ${selectedId ? styles.layoutWithSidebar : ''}`}>
        {/* Left: class card area */}
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>클래스 목록</h2>
              <p className={styles.subtitle}>클래스를 선택해주세요.</p>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.btnDark} onClick={() => setIsCreateModalOpen(true)}>
                클래스 만들기
              </button>
              <div className={styles.moreWrapper} ref={dropdownRef}>
                <button
                  className={`${styles.btnOutline} ${selectedId ? styles.btnOutlineActive : ''}`}
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
                  <div className={styles.cardStatusRow}>
                    <span className={`${styles.statusDot} ${styles[`status_${cls.status}`]}`} />
                    <span className={`${styles.statusText} ${isSelected ? styles.statusTextSelected : ''}`}>
                      {STATUS_LABEL[cls.status]}
                    </span>
                  </div>
                  <div className={`${styles.cardTitle} ${isSelected ? styles.cardTitleSelected : ''}`}>
                    {cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? '미지정'}
                  </div>
                  <div className={`${styles.cardSubject} ${isSelected ? styles.cardSubjectSelected : ''}`}>
                    | {cls.subject}
                  </div>
                  <button
                    className={`${styles.moveBtn} ${isSelected ? styles.moveBtnSelected : ''}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/classes/${cls.id}`); }}
                  >
                    과목 대기실로 이동&nbsp;→
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

        {/* Right: student sidebar — only visible when a class is selected */}
        {selectedId && <StudentSidebar />}
      </div>

      {isCreateModalOpen && (
        <CreateClassModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={fetchClasses}
        />
      )}
      {isEditModalOpen && selectedClass && (
        <CreateClassModal
          mode="edit"
          classId={selectedClass.id}
          initialData={{ subject: selectedClass.subject, theme: 0 }}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={fetchClasses}
        />
      )}
      {isCodeModalOpen && selectedClass && (
        <SessionCodeModal
          onClose={() => setIsCodeModalOpen(false)}
          inviteCode={selectedClass.invite_code}
        />
      )}
    </div>
  );
};
