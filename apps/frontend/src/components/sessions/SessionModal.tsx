'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type Session, type CreateSessionBody } from '@/actions/sessions';
import dayjs from 'dayjs';
import styles from './CreateSessionModal.module.css';

interface Props {
  open: boolean;
  classId: number;
  session: Session;
  onClose: () => void;
  onSubmit: (body: CreateSessionBody) => void | Promise<void>;
}

export const SessionModal: React.FC<Props> = ({ open, classId, session, onClose, onSubmit }) => {
  const [name,          setName]          = useState(session.session_name ?? '');
  const [explanation,   setExplanation]   = useState(session.explanation ?? '');
  const [objective,     setObjective]     = useState(session.objective ?? '');
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (!session.scheduled_date) return '';
    const d = new Date(session.scheduled_date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  });
  const [scheduledStart, setScheduledStart] = useState(
    session.scheduled_start ? dayjs(session.scheduled_start).format('HH:mm') : ''
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    session.scheduled_end ? dayjs(session.scheduled_end).format('HH:mm') : ''
  );

  useEffect(() => {
    setName(session.session_name ?? '');
    setExplanation(session.explanation ?? '');
    setObjective(session.objective ?? '');
    if (session.scheduled_date) {
      const d = new Date(session.scheduled_date);
      setScheduledDate(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    } else {
      setScheduledDate('');
    }
    setScheduledStart(session.scheduled_start ? dayjs(session.scheduled_start).format('HH:mm') : '');
    setScheduledEnd(session.scheduled_end ? dayjs(session.scheduled_end).format('HH:mm') : '');
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const body: CreateSessionBody = {
      class_id: classId,
      session_name: name.trim(),
      explanation: explanation.trim() || undefined,
      objective: objective.trim() || undefined,
      scheduled_date: scheduledDate ? `${scheduledDate}T12:00:00.000Z` : undefined,
      scheduled_start: scheduledDate && scheduledStart ? dayjs(`${scheduledDate}T${scheduledStart}`).toISOString() : undefined,
      scheduled_end:   scheduledDate && scheduledEnd   ? dayjs(`${scheduledDate}T${scheduledEnd}`).toISOString()   : undefined,
    };

    await onSubmit(body);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} aria-describedby={undefined}>

          <Dialog.Close asChild>
            <button className={styles.closeBtn} aria-label="닫기"><X size={20} /></button>
          </Dialog.Close>

          <Dialog.Title className={styles.title}>세션 수정</Dialog.Title>

          <form onSubmit={handleSubmit}>
            <p className={styles.sectionLabel}>기본 정보</p>
            <div className={styles.fieldsContainer}>

              {/* 세션 이름 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>세션 이름</label>
                <div className={styles.inputWrapper}>
                  <input
                    className={`${styles.input} ${styles.inputWithCounter}`}
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 50))}
                    placeholder="예) 고려중학교 3학년 2반 - 1회차"
                  />
                  <span className={styles.inputCounter}>{name.length} / 50</span>
                </div>
              </div>

              {/* 설명 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>설명 <span className={styles.fieldOptional}>(선택)</span></label>
                <input
                  className={styles.input}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="수업 설명을 입력하세요"
                />
              </div>

              {/* 학습 목표 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>학습 목표 <span className={styles.fieldOptional}>(선택)</span></label>
                <input
                  className={styles.input}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="이번 수업의 목표를 입력하세요"
                />
              </div>

              {/* 날짜 + 시작/종료 시간 */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>수업 일정 <span className={styles.fieldOptional}>(선택)</span></label>
                <div className={styles.fieldRow}>
                  <div className={styles.halfField}>
                    <input
                      type="date"
                      className={`${styles.input} ${scheduledDate ? styles.inputFilled : ''}`}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.timeField}>
                    <input
                      type="time"
                      className={`${styles.input} ${scheduledStart ? styles.inputFilled : ''}`}
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                  <div className={styles.timeSep}>~</div>
                  <div className={styles.timeField}>
                    <input
                      type="time"
                      className={`${styles.input} ${scheduledEnd ? styles.inputFilled : ''}`}
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>취소</button>
              <button type="submit" className={styles.nextBtn} disabled={!name.trim()}>
                수정 완료
              </button>
            </div>
          </form>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
