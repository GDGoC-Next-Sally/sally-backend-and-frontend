'use client';

import React, { useMemo } from 'react';
import { X, Clock, Users } from 'lucide-react';
import styles from './SessionEndModal.module.css';
import type { AttendanceStudent } from '@/actions/sessions';
import type { StudentAnalysis } from './SessionWidget';

interface SessionEndModalProps {
  sessionName?: string;
  localStudents: AttendanceStudent[];
  sessionActiveTime: Date | null;
  analysisMap: Map<string, StudentAnalysis>;
  onClose: () => void;
  onConfirm: () => void;
}

function DonutChart({ pct, color = '#22C55E' }: { pct: number; color?: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className={styles.donutSvg}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#EBEBEA" strokeWidth="8" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}

function useElapsedLabel(startTime: Date | null): string {
  if (!startTime) return '';
  const diff = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export const SessionEndModal: React.FC<SessionEndModalProps> = ({
  sessionName,
  localStudents,
  sessionActiveTime,
  analysisMap,
  onClose,
  onConfirm,
}) => {
  const elapsed = useElapsedLabel(sessionActiveTime);

  const { participationPct, avgUnderstanding, interventionCount } = useMemo(() => {
    const total = localStudents.length;
    const active = analysisMap.size;
    const participationPct = total > 0 ? Math.round((active / total) * 100) : 0;

    const scores = Array.from(analysisMap.values())
      .map(a => a.understanding_score)
      .filter((s): s is number => s != null);
    const avgRaw = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const avgUnderstanding = Math.round(avgRaw * 10);

    const interventionCount = Array.from(analysisMap.values()).filter(a => a.need_intervention).length;

    return { participationPct, avgUnderstanding, interventionCount };
  }, [localStudents, analysisMap]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>

        <h2 className={styles.title}>세션이 종료되었습니다.</h2>

        <div className={styles.separator} />

        <div className={styles.infoRow}>
          <span className={styles.sessionTitle}>{sessionName ?? '세션'}</span>
          <span className={styles.badge}>종료</span>
        </div>

        <div className={styles.metaRow}>
          {elapsed && (
            <div className={styles.metaItem}>
              <Clock size={13} />
              <span>수업 시간 {elapsed}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <Users size={13} />
            <span>{localStudents.length}명 참여</span>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statTitle}>참여율</span>
            <div className={styles.donutWrapper}>
              <DonutChart pct={participationPct} />
              <div className={styles.donutText}>
                {participationPct}<span className={styles.donutSmall}>%</span>
              </div>
            </div>
            <span className={styles.statSub}>접속 {analysisMap.size}/{localStudents.length}명</span>
          </div>

          <div className={styles.statItem}>
            <span className={styles.statTitle}>평균 이해도</span>
            <div className={styles.donutWrapper}>
              <DonutChart pct={avgUnderstanding} />
              <div className={styles.donutText}>
                {avgUnderstanding}<span className={styles.donutSmall}>%</span>
              </div>
            </div>
            <span className={styles.statSub}>분석 {analysisMap.size}명 기준</span>
          </div>

          <div className={styles.statItem}>
            <span className={styles.statTitle}>개입 필요</span>
            <div className={styles.textStat}>
              {interventionCount}<span className={styles.textStatSmall}>명</span>
            </div>
            <span className={styles.statSub}>총 경고 발생 학생</span>
          </div>
        </div>

        <div className={styles.separator} />

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.confirmBtn} onClick={onConfirm}>세션 종료</button>
        </div>
      </div>
    </div>
  );
};
