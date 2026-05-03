'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './SessionPrep.module.css';

export const SessionPrep = () => {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const sessionId = params.sessionId as string;

  const handleStart = () => {
    router.push(`/t/classes/${classId}/sessions/${sessionId}/active`);
  };

  const handleBack = () => {
    router.push(`/t/classes/${classId}`);
  };

  return (
    <div className={styles.mainContent}>
      {/* Top header bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            &lt;
          </button>
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

      {/* Main waiting card */}
      <div className={styles.waitCard}>
        {/* Illustration placeholder */}
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

        <button className={styles.startBtn} onClick={handleStart}>
          세션 시작하기
        </button>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#868e96" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={styles.statLabel}>시작 예정</div>
            <div className={styles.statValue}>13:30</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#868e96" strokeWidth="2">
                <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" /><line x1="12" y1="18" x2="12" y2="18" />
              </svg>
            </div>
            <div className={styles.statLabel}>입장 가능 시간</div>
            <div className={styles.statValue}>13:20부터</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#868e96" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={styles.statLabel}>예상 소요 시간</div>
            <div className={styles.statValue}>45분</div>
          </div>
        </div>
      </div>
    </div>
  );
};
