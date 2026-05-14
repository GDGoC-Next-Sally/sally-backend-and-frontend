'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2 } from 'lucide-react';
import styles from './CreateClassModal.module.css';
import type { CreateClassBody, DayOfWeek, ScheduleEntry } from '@/actions/classes';

interface ClassFormData {
  subject: string;
  grade: string;
  homeroom: string;
  explanation: string;
  theme: number;
  schedule: ScheduleEntry[];
}

interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  initialData?: Partial<ClassFormData>;
  classId?: number;
  onSubmit: (body: CreateClassBody) => void;
}

const GRADES: { label: string; value: number }[] = [
  { label: '중등 1학년', value: 1 },
  { label: '중등 2학년', value: 2 },
  { label: '중등 3학년', value: 3 },
  { label: '고등 1학년', value: 4 },
  { label: '고등 2학년', value: 5 },
  { label: '고등 3학년', value: 6 },
];

const THEMES = ['#495057', '#D4C9F0', '#b2f2bb', '#ffd8a8', '#a5d8ff'];
const THEME_NAMES = ['slate', 'lavender', 'mint', 'peach', 'sky'];

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'MON', label: '월' },
  { value: 'TUE', label: '화' },
  { value: 'WED', label: '수' },
  { value: 'THU', label: '목' },
  { value: 'FRI', label: '금' },
  { value: 'SAT', label: '토' },
  { value: 'SUN', label: '일' },
  { value: 'FLEXIBLE', label: '유동' },
];

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  open,
  onClose,
  mode = 'create',
  initialData,
  classId,
  onSubmit,
}) => {
  const [subject,     setSubject]     = useState(initialData?.subject      ?? '');
  const [grade,       setGrade]       = useState(initialData?.grade        ?? '1');
  const [homeroom,    setHomeroom]    = useState(initialData?.homeroom     ?? '');
  const [explanation, setExplanation] = useState(initialData?.explanation  ?? '');
  const [theme,       setTheme]       = useState(initialData?.theme        ?? 0);
  const [schedule,    setSchedule]    = useState<ScheduleEntry[]>(initialData?.schedule ?? []);
  const [error,       setError]       = useState('');

  const isEdit = mode === 'edit';

  const addScheduleRow = () => {
    setSchedule((prev) => [...prev, { day: 'MON', period: 1 }]);
  };

  const removeScheduleRow = (idx: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateScheduleDay = (idx: number, day: DayOfWeek) => {
    setSchedule((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, day, period: day === 'FLEXIBLE' ? undefined : (s.period ?? 1) }
          : s
      )
    );
  };

  const updateSchedulePeriod = (idx: number, period: number) => {
    setSchedule((prev) => prev.map((s, i) => (i === idx ? { ...s, period } : s)));
  };

  const handleConfirm = () => {
    if (!subject.trim()) {
      setError('과목 명을 입력해주세요.');
      return;
    }
    setError('');

    const body: CreateClassBody = {
      subject: subject.trim(),
      grade: parseInt(grade, 10),
      homeroom: homeroom.trim() || undefined,
      explanation: explanation.trim() || undefined,
      theme: THEME_NAMES[theme],
      schedule: schedule.length > 0 ? schedule : undefined,
    };

    onSubmit(body);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby={undefined}>
          <Dialog.Close asChild>
            <button className={styles.closeBtn} aria-label="닫기">
              <X size={20} />
            </button>
          </Dialog.Close>

          <Dialog.Title className={styles.title}>
            {isEdit ? '클래스 수정하기' : '클래스 생성하기'}
          </Dialog.Title>

          {/* 과목명 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>과목 명</label>
            <input
              type="text"
              className={styles.input}
              placeholder="예) 인공지능과 미래사회"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* 학년 + 반 */}
          <div className={styles.twoCol}>
            <div className={styles.formGroup}>
              <label className={styles.label}>학년</label>
              <select className={styles.select} value={grade} onChange={(e) => setGrade(e.target.value)}>
                {GRADES.map((g) => (
                  <option key={g.value} value={String(g.value)}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>반 (선택)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="예) A반"
                value={homeroom}
                onChange={(e) => setHomeroom(e.target.value)}
              />
            </div>
          </div>

          {/* 클래스 설명 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>클래스 설명 (선택)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="예) 2024년 1학기 정보 수업입니다."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>

          {/* 배경 테마 */}
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

          {/* 수업 시간표 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>수업 시간표 (선택)</label>
            <div className={styles.scheduleList}>
              {schedule.map((entry, idx) => (
                <div key={idx} className={styles.scheduleRow}>
                  <select
                    className={styles.scheduleSelect}
                    value={entry.day}
                    onChange={(e) => updateScheduleDay(idx, e.target.value as DayOfWeek)}
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  {entry.day !== 'FLEXIBLE' && (
                    <div className={styles.periodInputWrapper}>
                      <input
                        type="number"
                        className={styles.periodInput}
                        min={1}
                        max={20}
                        value={entry.period ?? 1}
                        onChange={(e) => updateSchedulePeriod(idx, parseInt(e.target.value, 10) || 1)}
                      />
                      <span className={styles.periodUnit}>교시</span>
                    </div>
                  )}
                  <button
                    className={styles.removeRowBtn}
                    onClick={() => removeScheduleRow(idx)}
                    aria-label="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button className={styles.addRowBtn} onClick={addScheduleRow}>
                <Plus size={14} />
                시간 추가
              </button>
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>취소</button>
            <button className={styles.nextBtn} onClick={handleConfirm}>
              {isEdit ? '수정 완료' : '생성 완료'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
