'use client';

import React, { useState } from 'react';
import { type Session, type CreateSessionBody } from '@/actions/sessions';
import { X } from 'lucide-react';
import styles from './SessionModal.module.css';
import dayjs from 'dayjs';

interface Props {
  classId: number;
  session?: Session;
  onClose: () => void;
  onSubmit: (body: CreateSessionBody) => void | Promise<void>;
}

export const SessionModal: React.FC<Props> = ({ classId, session, onClose, onSubmit }) => {
  const isEdit = !!session;

  const [name, setName] = useState(session?.session_name ?? '');
  const [explanation, setExplanation] = useState(session?.explanation ?? '');
  const [objective, setObjective] = useState(session?.objective ?? '');
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (!session?.scheduled_date) return '';
    const d = new Date(session.scheduled_date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  });
  const [scheduledStart, setScheduledStart] = useState(session?.scheduled_start ? dayjs(session.scheduled_start).format('HH:mm') : '');
  const [scheduledEnd, setScheduledEnd] = useState(session?.scheduled_end ? dayjs(session.scheduled_end).format('HH:mm') : '');
  const [period, setPeriod] = useState<string>(session?.period?.toString() ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('세션 이름을 입력해주세요.'); return; }
    setError('');

    const body: CreateSessionBody = {
      class_id: classId,
      session_name: name.trim(),
      explanation: explanation.trim() || undefined,
      objective: objective.trim() || undefined,
      scheduled_date: scheduledDate ? `${scheduledDate}T12:00:00.000Z` : undefined,
      scheduled_start: scheduledDate && scheduledStart ? dayjs(`${scheduledDate}T${scheduledStart}`).toISOString() : undefined,
      scheduled_end: scheduledDate && scheduledEnd ? dayjs(`${scheduledDate}T${scheduledEnd}`).toISOString() : undefined,
      period: period ? Number(period) : undefined,
    };

    onSubmit(body);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          <X size={20} />
        </button>

        <h2 className={styles.title}>{isEdit ? '세션 수정' : '새 세션 만들기'}</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>세션 이름 *</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 5월 3일 영어 수업" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>설명</label>
            <input className={styles.input} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="수업 설명을 입력하세요" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>학습 목표</label>
            <input className={styles.input} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="이번 수업의 목표를 입력하세요" />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>수업 날짜</label>
              <input className={styles.input} type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>교시</label>
              <input className={styles.input} type="number" min={1} max={9} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="예) 3" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>시작 시간</label>
              <input className={styles.input} type="time" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>종료 시간</label>
              <input className={styles.input} type="time" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>취소</button>
            <button type="submit" className={styles.submitBtn}>
              {isEdit ? '수정 완료' : '세션 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
