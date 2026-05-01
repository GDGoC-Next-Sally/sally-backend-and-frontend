'use client';

import React, { useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import styles from './CreateClassModal.module.css';

interface ClassFormData {
  subject: string;
  semester: string;
  grade: string;
  homeroom: string;
  theme: number;
  classType: string;
}

interface CreateClassModalProps {
  onClose: () => void;
  mode?: 'create' | 'edit';
  initialData?: Partial<ClassFormData>;
  classId?: number;
  onSuccess?: () => void;
}

const SEMESTERS = ['2025년 1학기', '2025년 2학기', '2026년 1학기', '2026년 2학기'];
const GRADES   = ['중등 1학년', '중등 2학년', '중등 3학년', '고등 1학년', '고등 2학년', '고등 3학년'];
const THEMES   = ['#495057', '#D4C9F0', '#b2f2bb', '#ffd8a8', '#a5d8ff'];
const THEME_NAMES = ['slate', 'lavender', 'mint', 'peach', 'sky'];

function gradeNumberFromLabel(label: string): number {
  const match = label.match(/(\d)학년/);
  return match ? parseInt(match[1], 10) : 1;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  onClose,
  mode = 'create',
  initialData,
  classId,
  onSuccess,
}) => {
  const [subject,   setSubject]   = useState(initialData?.subject   ?? '');
  const [semester,  setSemester]  = useState(initialData?.semester  ?? SEMESTERS[0]);
  const [grade,     setGrade]     = useState(initialData?.grade     ?? GRADES[2]);
  const [homeroom,  setHomeroom]  = useState(initialData?.homeroom  ?? '');
  const [theme,     setTheme]     = useState(initialData?.theme     ?? 0);
  const [classType, setClassType] = useState(initialData?.classType ?? '정규 수업');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const isEdit = mode === 'edit';

  const handleConfirm = async () => {
    if (!subject.trim()) {
      setError('과목 명을 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);

    const body = {
      subject: subject.trim(),
      grade: gradeNumberFromLabel(grade),
      homeroom: homeroom.trim() || undefined,
      explanation: `${classType} / ${semester}`,
      theme: THEME_NAMES[theme],
    };

    try {
      if (isEdit && classId) {
        await fetchWithAuth(`/classes/${classId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await fetchWithAuth('/classes', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류가 발생했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className={styles.title}>{isEdit ? '클래스 수정하기' : '클래스 생성하기'}</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>과목 명</label>
          <input
            type="text"
            className={styles.input}
            placeholder="예) 중동 영어 2단원"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>학기</label>
          <select className={styles.select} value={semester} onChange={(e) => setSemester(e.target.value)}>
            {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.formGroup}>
            <label className={styles.label}>학년</label>
            <select className={styles.select} value={grade} onChange={(e) => setGrade(e.target.value)}>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>반 (선택)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="예) 4반"
              value={homeroom}
              onChange={(e) => setHomeroom(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>배경 테마</label>
          <div className={styles.colorGroup}>
            {THEMES.map((color, idx) => (
              <div
                key={idx}
                className={`${styles.colorCircle} ${theme === idx ? styles.colorCircleActive : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setTheme(idx)}
              />
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>수업 유형</label>
          <div className={styles.buttonGroup}>
            {['정규 수업', '보충', '자율'].map((type) => (
              <button
                key={type}
                className={`${styles.typeBtn} ${classType === type ? styles.typeBtnActive : ''}`}
                onClick={() => setClassType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>취소</button>
          <button className={styles.nextBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? '처리 중...' : isEdit ? '수정 완료' : '생성 완료'}
          </button>
        </div>
      </div>
    </div>
  );
};
