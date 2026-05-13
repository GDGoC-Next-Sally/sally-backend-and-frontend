'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { RefreshCw, MoreHorizontal } from 'lucide-react';
import styles from './SessionSidebar.module.css';
import type { AttendanceStudent } from '@/actions/sessions';
import type { StudentAnalysis } from './SessionWidget';

interface Props {
  phase: 'waiting' | 'active';
  students: AttendanceStudent[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onRefresh?: () => void;
  onEnd?: () => void;
  analysisMap?: Map<string, StudentAnalysis>;
  sessionStartTime?: Date | null;
}

function useElapsed(startTime: Date | null | undefined): string {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startTime) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [startTime]);
  return elapsed;
}

export const SessionSidebar: React.FC<Props> = ({
  phase,
  students,
  selectedId,
  onSelect,
  onRefresh,
  onEnd,
  analysisMap,
  sessionStartTime,
}) => {
  const elapsed = useElapsed(sessionStartTime);

  const unitTopics = Array.from(
    new Set(
      Array.from(analysisMap?.values() ?? [])
        .map(a => a.current_topic)
        .filter((t): t is string => !!t)
    )
  );

  return (
    <aside className={styles.sidebar}>
      {phase === 'active' && (
        <button className={styles.endBtn} onClick={onEnd} type="button">
          <span>수업 종료 하기</span>
          {elapsed && <span className={styles.endBtnTime}>{elapsed}</span>}
        </button>
      )}

      <div className={styles.header}>
        <h2 className={styles.title}>
          접속 중인 학생 <span className={styles.count}>{students.length}</span>
        </h2>
        {phase === 'waiting' && (
          <button className={styles.refreshBtn} type="button" onClick={onRefresh}>
            <RefreshCw size={18} />
          </button>
        )}
      </div>

      {students.length === 0 ? (
        <p className={styles.empty}>아직 입장한 학생이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {students.map((student, idx) => {
            const isSelected = phase === 'active' && student.userId === selectedId;
            const analysis = analysisMap?.get(student.userId);
            const needsIntervention = analysis?.need_intervention;
            const progressPct = analysis?.understanding_score != null
              ? analysis.understanding_score * 10
              : null;

            return (
              <li
                key={student.userId ?? `student-${idx}`}
                className={[
                  styles.item,
                  isSelected ? styles.itemSelected : '',
                  phase === 'active' ? styles.itemClickable : '',
                  needsIntervention ? styles.itemWarning : '',
                ].join(' ')}
                onClick={() => phase === 'active' && onSelect?.(student.userId)}
              >
                <div className={styles.itemHeader}>
                  <div className={styles.studentInfo}>
                    <div className={styles.avatar}>
                      <Image src="/images/profile_mini.png" alt={student.name} width={32} height={32} />
                    </div>
                    <span className={styles.name}>{student.name}</span>
                  </div>
                  <div className={styles.itemActions}>
                    {progressPct != null && (
                      <span className={styles.progressBadge}>진행률 {progressPct}%</span>
                    )}
                    <button
                      className={styles.moreBtn}
                      onClick={(e) => e.stopPropagation()}
                      type="button"
                    >
                      <MoreHorizontal size={16} color="#9ca3af" />
                    </button>
                  </div>
                </div>

                {analysis?.one_line_summary ? (
                  <div className={styles.summaryText}>{analysis.one_line_summary}</div>
                ) : (
                  <div className={styles.summaryText}>수업중인 개념</div>
                )}

                {isSelected && analysis && (
                  <div className={styles.statsGrid}>
                    <div className={styles.statCell}>
                      <div className={styles.statLabel}>참여도</div>
                      <div className={styles.statValue}>{analysis.engagement_level ?? '-'}</div>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statCell}>
                      <div className={styles.statLabel}>이해도</div>
                      <div className={styles.statValue}>
                        {analysis.understanding_score != null ? `${analysis.understanding_score * 10}%` : '-'}
                      </div>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statCell}>
                      <div className={styles.statLabel}>감정 상태</div>
                      <div className={`${styles.statValue} ${styles.emotionValue}`}>
                        {analysis.student_emotion ?? '-'}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {phase === 'active' && unitTopics.length > 0 && (
        <div className={styles.unitSection}>
          <div className={styles.unitTitle}>수업 단원</div>
          <div className={styles.unitChips}>
            {unitTopics.map((topic, i) => (
              <span key={i} className={styles.unitChip}>{topic}</span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
