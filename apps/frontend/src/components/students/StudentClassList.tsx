'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStudentClasses, leaveClass } from '@/actions/classes';
import { JoinClassModal } from './JoinClassModal';
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

export const StudentClassList = () => {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchClasses = useCallback(() => {
    getStudentClasses()
      .then((data) => {
        setClasses(data);
        if (data.length > 0 && selectedId === null) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => setClasses([]));
  }, [selectedId]);

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

  const handleLeave = async () => {
    if (!selectedId || !confirm('이 클래스에서 나가시겠습니까?')) return;
    try {
      await leaveClass(selectedId);
      setSelectedId(null);
      fetchClasses();
    } catch (e) {
      alert(e instanceof Error ? e.message : '클래스 나가기에 실패했습니다.');
    }
    setShowDropdown(false);
  };

  const filtered = classes.filter((c) =>
    `${c.subject} ${c.grade ?? ''} ${c.homeroom ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClass = classes.find((c) => c.id === selectedId) ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>과목 리스트</h2>
              <p className={styles.subtitle}>수강 중인 과목을 선택해주세요.</p>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.newBtn} onClick={() => setIsJoinModalOpen(true)}>
                새로운 과목
              </button>
              <div className={styles.moreWrapper} ref={dropdownRef}>
                <button
                  className={`${styles.moreBtn} ${selectedId ? styles.moreBtnActive : ''}`}
                  onClick={() => selectedId && setShowDropdown((v) => !v)}
                  disabled={!selectedId}
                >
                  더보기
                </button>
                {showDropdown && selectedClass && (
                  <div className={styles.dropdownMenu}>
                    <button
                      className={`${styles.menuItem} ${styles.menuItemDanger}`}
                      onClick={handleLeave}
                    >
                      클래스 나가기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                  {isSelected && (
                    <div className={styles.starIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  )}

                  {cls.schedule && (
                    <div className={styles.cardSchedule}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {cls.schedule}
                    </div>
                  )}

                  <div className={styles.cardTitle}>{cls.subject}</div>
                  {cls.teacher && (
                    <div className={styles.cardTeacher}>| {cls.teacher}</div>
                  )}

                  <button
                    className={`${styles.moveBtn} ${isSelected ? styles.moveBtnSelected : ''}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/s/classes/${cls.id}`); }}
                  >
                    <span>과목 대기실로 이동</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className={styles.empty}>
                {search ? '검색 결과가 없습니다.' : '수강 중인 클래스가 없습니다.\n새로운 과목 버튼으로 참여해보세요.'}
              </div>
            )}
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>클래스 정보</span>
          </div>
          {selectedClass ? (
            <div className={styles.classInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>과목</span>
                <span className={styles.infoValue}>{selectedClass.subject}</span>
              </div>
              {selectedClass.grade && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>학년</span>
                  <span className={styles.infoValue}>{selectedClass.grade}학년 {selectedClass.homeroom ?? ''}</span>
                </div>
              )}
              {selectedClass.teacher && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>선생님</span>
                  <span className={styles.infoValue}>{selectedClass.teacher}</span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>상태</span>
                <span className={`${styles.statusBadge} ${styles[`status${selectedClass.status}`]}`}>
                  {selectedClass.status === 'ACTIVE' ? '진행 중' : selectedClass.status === 'PLANNING' ? '준비 중' : '종료'}
                </span>
              </div>
              {selectedClass.explanation && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>설명</span>
                  <span className={styles.infoValue}>{selectedClass.explanation}</span>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.sidebarEmpty}>클래스를 선택하면<br />정보가 표시됩니다.</p>
          )}
        </div>
      </div>

      {isJoinModalOpen && (
        <JoinClassModal
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={() => {
            setIsJoinModalOpen(false);
            fetchClasses();
          }}
        />
      )}
    </div>
  );
};
