'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ProfileStudentIcon from '@/components/icons/ProfileStudentIcon';
import styles from './StudentMonitorGrid.module.css';
import type { AttendanceStudent } from '@/actions/sessions';
import type { StudentAnalysis } from './SessionWidget';

interface StudentMonitorGridProps {
  students: AttendanceStudent[];
  analysisMap: Map<string, StudentAnalysis>;
}

const EMOTION_EMOJI: Record<string, string> = {
  행복: '😊',
  불안: '😟',
  집중: '🧐',
  혼란: '😕',
  지루: '😑',
  흥미: '🤩',
  피곤: '😴',
};

const POSITIVE_EMOTIONS = new Set(['집중', '흥미', '자신감']);
const NEGATIVE_EMOTIONS = new Set(['혼란', '좌절', '불안', '지루함', '무기력', '짜증', '무반응']);

function emotionDotColor(emotion?: string): string {
  if (!emotion) return '#E0DED8';
  if (POSITIVE_EMOTIONS.has(emotion)) return '#22c55e';
  if (NEGATIVE_EMOTIONS.has(emotion)) return '#ef4444';
  return '#E0DED8';
}

function UnderstandingBar({ score }: { score: number }) {
  const pct = score * 10;
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className={styles.barTrack}>
      <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function StudentCard({ student, analysis }: { student: AttendanceStudent; analysis?: StudentAnalysis }) {
  const needsIntervention = analysis?.need_intervention;
  const pct = analysis?.understanding_score != null ? analysis.understanding_score * 10 : null;
  const emotionEmoji = analysis?.student_emotion ? (EMOTION_EMOJI[analysis.student_emotion] ?? '•') : null;

  return (
    <div className={`${styles.card} ${needsIntervention ? styles.cardWarning : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.avatarWrap}>
          <ProfileStudentIcon width={32} height={32} />
        </div>
        <div className={styles.nameBlock}>
          <span className={styles.studentName}>{student.name}</span>
          {analysis?.current_topic && (
            <span className={styles.topic}>{analysis.current_topic}</span>
          )}
        </div>
        <div className={styles.statusDot} style={{
          backgroundColor: emotionDotColor(analysis?.student_emotion)
        }} />
      </div>

      {analysis ? (
        <div className={styles.statsBox}>
          <div className={styles.statCell}>
            <span className={styles.statLabel}>이해도</span>
            {pct != null ? (
              <>
                <span className={styles.statValue}>{pct}%</span>
                <UnderstandingBar score={analysis.understanding_score!} />
              </>
            ) : (
              <span className={styles.statValue}>-</span>
            )}
          </div>

          <div className={styles.statDivider} />

          <div className={styles.statCell}>
            <span className={styles.statLabel}>참여도</span>
            <span className={styles.statValue}>{analysis.engagement_level ?? '-'}</span>
          </div>

          <div className={styles.statDivider} />

          <div className={styles.statCell}>
            <span className={styles.statLabel}>감정</span>
            <span className={styles.statValue}>
              {emotionEmoji && <span className={styles.emotionEmoji}>{emotionEmoji}</span>}
              {analysis.student_emotion ?? '-'}
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.noData}>분석 데이터 대기 중...</div>
      )}

    </div>
  );
}

export const StudentMonitorGrid: React.FC<StudentMonitorGridProps> = ({ students, analysisMap }) => {
  if (students.length === 0) {
    return (
      <div className={styles.empty}>
        아직 입장한 학생이 없습니다.
      </div>
    );
  }

  const interventionCount = Array.from(analysisMap.values()).filter(a => a.need_intervention).length;

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <span className={styles.topBarLabel}>전체 학생 <strong>{students.length}명</strong></span>
        {interventionCount > 0 && (
          <span className={styles.warningBadge}>
            <AlertTriangle size={12} />
            개입 필요 {interventionCount}명
          </span>
        )}
      </div>
      <div className={styles.grid}>
        {students.map(student => (
          <StudentCard
            key={student.userId}
            student={student}
            analysis={analysisMap.get(student.userId)}
          />
        ))}
      </div>
    </div>
  );
};
