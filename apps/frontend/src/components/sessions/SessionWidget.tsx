'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SessionSidebar } from './SessionSidebar';
import {
  startSession,
  finishSession,
  getAttendance,
  getSession,
  type AttendanceStudent,
} from '@/actions/sessions';
import styles from './SessionWidget.module.css';

type Phase = 'waiting' | 'active';

export const SessionWidget = () => {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const sessionId = params.sessionId as string;

  const [phase, setPhase] = useState<Phase | null>(null); // null = 초기화 전
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      const data = await getAttendance(sessionId);
      setStudents(data);
      if (data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data[0].userId);
      }
    } catch {
      // 출석 데이터 없으면 빈 목록 유지
    }
  }, [sessionId, selectedStudentId]);

  // 진입 시 백엔드 세션 상태로 phase 초기화
  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession(sessionId);
        const initialPhase: Phase = session.status === 'ACTIVE' ? 'active' : 'waiting';
        setPhase(initialPhase);
        await fetchAttendance();
      } catch {
        setPhase('waiting');
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startSession(sessionId);
      await fetchAttendance();
      setPhase('active');
    } catch (e) {
      alert(e instanceof Error ? e.message : '세션 시작에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!confirm('세션을 종료하시겠습니까?')) return;
    setLoading(true);
    try {
      await finishSession(sessionId);
      router.push(`/t/classes/${classId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '세션 종료에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = students.find((s) => s.userId === selectedStudentId);

  if (phase === null) {
    return (
      <div className={styles.layout}>
        <div className={styles.initializing}>세션 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <SessionSidebar
        phase={phase}
        students={students}
        selectedId={selectedStudentId}
        onSelect={setSelectedStudentId}
        onRefresh={fetchAttendance}
      />

      {phase === 'waiting' ? (
        <WaitingView
          loading={loading}
          onStart={handleStart}
          onBack={() => router.push(`/t/classes/${classId}`)}
        />
      ) : (
        <ActiveView
          loading={loading}
          studentName={selectedStudent?.name ?? '학생'}
          onEnd={handleFinish}
        />
      )}
    </div>
  );
};

/* ── Waiting ────────────────────────────────────────────────────────────────── */

interface WaitingProps {
  loading: boolean;
  onStart: () => void;
  onBack: () => void;
}

const WaitingView: React.FC<WaitingProps> = ({ loading, onStart, onBack }) => (
  <div className={styles.mainContent}>
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <button className={styles.backBtn} onClick={onBack}>&lt;</button>
        <div>
          <div className={styles.sessionName}>5월 3일 영어 수업</div>
          <div className={styles.sessionDesc}>관계대명사 단원 학습 중</div>
        </div>
      </div>
      <div className={styles.topBarRight}>
        <span className={styles.statusBadge}>시작 대기</span>
        <span className={styles.timeInfo}>시작 13:34 &nbsp;|&nbsp; 0분 경과</span>
        <button className={styles.leaveBtn} onClick={onBack}>나가기</button>
      </div>
    </div>

    <div className={styles.waitCard}>
      <div className={styles.illustration}>
        <svg width="100" height="80" viewBox="0 0 100 80" fill="none">
          <circle cx="50" cy="28" r="24" fill="#e6fcf5" />
          <circle cx="50" cy="22" r="8" fill="#20c997" opacity="0.7" />
          <rect x="30" y="44" width="40" height="20" rx="4" fill="#20c997" opacity="0.5" />
          <circle cx="32" cy="56" r="6" fill="#20c997" opacity="0.8" />
          <circle cx="50" cy="56" r="6" fill="#20c997" opacity="0.8" />
          <circle cx="68" cy="56" r="6" fill="#20c997" opacity="0.8" />
          <circle cx="58" cy="8" r="4" fill="#20c997" opacity="0.4" />
          <circle cx="72" cy="18" r="3" fill="#20c997" opacity="0.3" />
          <circle cx="26" cy="16" r="3" fill="#20c997" opacity="0.3" />
        </svg>
      </div>
      <h2 className={styles.waitTitle}>곧 수업이 시작됩니다!</h2>
      <p className={styles.waitDesc}>
        학생들이 입장 중입니다.<br />
        준비를 마친 뒤 수업을 시작해 주세요.
      </p>
      <button className={styles.startBtn} onClick={onStart} disabled={loading}>
        {loading ? '시작 중...' : '세션 시작하기'}
      </button>
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>시작 예정</div>
          <div className={styles.statValue}>13:30</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <div className={styles.statLabel}>입장 가능 시간</div>
          <div className={styles.statValue}>13:20부터</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <div className={styles.statLabel}>예상 소요 시간</div>
          <div className={styles.statValue}>45분</div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Active ─────────────────────────────────────────────────────────────────── */

interface ActiveProps {
  loading: boolean;
  studentName: string;
  onEnd: () => void;
}

const ActiveView: React.FC<ActiveProps> = ({ loading, studentName, onEnd }) => (
  <div className={styles.mainContent}>
    <div className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <div>
          <div className={styles.sessionName}>5월 3일 영어 수업</div>
          <div className={styles.sessionDesc}>관계대명사 단원 학습 중</div>
        </div>
      </div>
      <div className={styles.topBarRight}>
        <span className={`${styles.statusBadge} ${styles.statusBadgeActive}`}>진행 중</span>
        <span className={styles.timeInfo}>시작 13:34 &nbsp;|&nbsp; 12분 경과</span>
        <button className={styles.leaveBtn} onClick={onEnd} disabled={loading}>
          {loading ? '종료 중...' : '세션 종료'}
        </button>
      </div>
    </div>

    <div className={styles.chatCard}>
      <div className={styles.chatHeader}>
        <div className={styles.chatTitleBlock}>
          <div className={styles.chatAvatar} />
          <div>
            <h2 className={styles.chatTitle}>{studentName} 학생과 AI 코치</h2>
            <span className={styles.chatSub}>관계대명사 단원 학습 중</span>
          </div>
        </div>
        <div className={styles.statusBar}>
          <span className={styles.statusLabel}>학습 상태</span>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
          </div>
          <span className={styles.statusValue}>안정 72/100</span>
        </div>
      </div>

      <div className={styles.chatMessages}>
        <div className={styles.messageRow}>
          <div className={styles.messageAvatar} />
          <div className={`${styles.bubble} ${styles.bubbleLeft}`} />
        </div>
        <div className={`${styles.messageRow} ${styles.messageRowRight}`}>
          <div className={styles.messageAvatar} />
          <div className={`${styles.bubble} ${styles.bubbleRight}`} />
        </div>
      </div>
    </div>
  </div>
);
