'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SessionSidebar } from './SessionSidebar';
import styles from './SessionWidget.module.css';

type Phase = 'waiting' | 'active';

export const SessionWidget = () => {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [phase, setPhase] = useState<Phase>('waiting');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);

  return (
    <div className={styles.layout}>
      <SessionSidebar
        phase={phase}
        selectedId={selectedStudentId}
        onSelect={setSelectedStudentId}
      />

      {phase === 'waiting' ? (
        <WaitingView
          onStart={() => setPhase('active')}
          onBack={() => router.push(`/t/classes/${classId}`)}
        />
      ) : (
        <ActiveView
          studentName="김고대"
          onEnd={() => setPhase('waiting')}
        />
      )}
    </div>
  );
};

/* ── Waiting ────────────────────────────────────────────────────────────────── */

interface WaitingProps {
  onStart: () => void;
  onBack: () => void;
}

const WaitingView: React.FC<WaitingProps> = ({ onStart, onBack }) => (
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
        <button className={styles.leaveBtn}>나가기</button>
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
      <button className={styles.startBtn} onClick={onStart}>세션 시작하기</button>
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
  studentName: string;
  onEnd: () => void;
}

const ActiveView: React.FC<ActiveProps> = ({ studentName, onEnd }) => (
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
        <button className={styles.leaveBtn} onClick={onEnd}>세션 종료</button>
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
