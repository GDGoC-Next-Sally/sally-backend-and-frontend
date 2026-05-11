'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './StudentDashboard.module.css';
import type { RecentSessionInfo } from '@/app/s/home/page';
import { computeSessionStatus } from '@/utils/sessionStatus';

interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
}

interface ActiveSessionInfo {
  id: number;
  classId: number;
  subject: string;
  period?: number | null;
}

interface StudentDashboardProps {
  user: { name: string } | null;
  classes: ClassItem[];
  activeSession?: ActiveSessionInfo | null;
  recentSessions?: RecentSessionInfo[];
}


const FEEDBACK_ITEMS = [
  '영어 수업 참여도가 지난주보다 12% 향상되었어요.',
  '수학 퀴즈 정답률이 평균보다 낮아요. 복습이 필요해요.',
  '국어 토론 참여 빈도가 꾸준히 증가하고 있어요.',
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, classes, activeSession, recentSessions = [] }) => {
  const router = useRouter();

  return (
    <div className={styles.container}>

      {/* ── Top Section ───────────────────────────────────────────────────── */}
      <div className={styles.topSection}>

        {/* 공지사항 */}
        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>공지사항</h3>
              <p className={styles.cardSubtitle}>3월 학습 리포트 업데이트 안내<br />새로운 분석 항목이 추가되었어요.</p>
            </div>
          </div>
          <div>
            <a href="#" className={styles.moreLink}>더보기 &gt;</a>
            <p className={styles.cardDate}>2026.03.04</p>
          </div>
        </div>

        {/* 나의 학습 진도 */}
        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>나의 학습 진도</h3>
              <div className={styles.progressTopRow}>
                <div className={styles.progressValue}>78<span className={styles.pct}>%</span></div>
                <div className={styles.progressDelta}>
                  지난주 대비&nbsp;
                  <span className={styles.up}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="#22C55E" style={{ verticalAlign: 'middle', marginRight: '2px' }}>
                      <path d="M12 3l9 18H3z" />
                    </svg>
                    6%p
                  </span>
                </div>
              </div>
            </div>
          </div>
          <svg viewBox="0 0 36 36" width="64" height="64">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EBEBEA" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" strokeWidth="3"
              strokeDasharray="78 22" strokeDashoffset="25" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className={styles.mainGrid}>

        {/* Left column */}
        <div className={styles.leftColumn}>

          {/* AI 피드백 요약 */}
          <div className={styles.aiFeedbackCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>AI 학습 피드백 요약</h2>
                <p className={styles.sectionSubtitle}>최근 7일간 나의 학습 데이터를 분석했어요.</p>
              </div>
              <button className={styles.detailBtn} onClick={() => router.push('/s/reports')}>상세 리포트 보기 &gt;</button>
            </div>

            <div className={styles.feedbackContent}>
              <div className={styles.feedbackChartArea}>
                <h3 className={styles.feedbackChartTitle}>종합 학습 참여도</h3>
                <div className={styles.donutWrapper}>
                  <div className={styles.donutCircle} />
                  <div className={styles.donutText}>78<span className={styles.donutSmall}>%</span></div>
                </div>
              </div>

              <div className={styles.feedbackListArea}>
                <h3 className={styles.feedbackListTitle}>이번 주 피드백</h3>
                {FEEDBACK_ITEMS.map((item, i) => (
                  <div key={i} className={styles.feedbackItem}>
                    <span className={styles.feedbackDot} />
                    <span>{item}</span>
                  </div>
                ))}
                <div className={styles.feedbackItem}>
                  <span className={styles.feedbackDot} style={{ background: '#ff6f6f' }} />
                  <span>수학 퀴즈 오답률 주의&nbsp;</span>
                  <span className={styles.feedbackBadge}>관심필요</span>
                </div>
              </div>
            </div>
          </div>

          {/* 바로가기 */}
          <div className={styles.quickLinksCard}>
            <h3 className={styles.quickLinksTitle}>바로가기</h3>
            <div className={styles.shortcutGrid}>
              {classes.slice(0, 5).map((cls) => (
                <button
                  key={cls.id}
                  className={styles.shortcutItem}
                  onClick={() => router.push(`/s/classes/${cls.id}`)}
                >
                  <div className={styles.shortcutIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <span className={styles.shortcutLabel}>{cls.subject}</span>
                  <span className={styles.shortcutSub}>
                    {cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? ''}
                  </span>
                </button>
              ))}
              {classes.length === 0 && (
                <button className={styles.shortcutItem} onClick={() => router.push('/s/classes')}>
                  <div className={styles.shortcutIcon} />
                  <span className={styles.shortcutLabel}>클래스 참여하기</span>
                  <span className={styles.shortcutSub}>초대 코드로 입장</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className={styles.rightColumn}>

          {/* 오늘의 클래스 */}
          <div className={styles.classCard}>
            <div className={styles.classHeader}>
              <div>
                <h2 className={styles.sectionTitle}>오늘의 클래스</h2>
                <p className={styles.sectionSubtitle}>실시간 현황 및 예정 수업</p>
              </div>
            </div>
            {activeSession ? (
              <>
                <div className={styles.liveCard}>
                  <div className={styles.liveBadgeRow}>
                    <span className={styles.liveBadge}>LIVE</span>
                    <span className={styles.liveSubLabel}>진행 중인 수업</span>
                  </div>
                  <div className={styles.liveTitle}>{activeSession.subject}</div>
                  {activeSession.period && (
                    <div className={styles.liveMeta}>
                      <span>⏱ {activeSession.period}교시</span>
                    </div>
                  )}
                  <button
                    className={styles.joinBtn}
                    onClick={() => router.push(`/s/classes/${activeSession.classId}/sessions/${activeSession.id}`)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    참여하기
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
                <p className={styles.motivationText}>✦ 오늘도 즐거운 배움의 하루가 되세요!</p>
              </>
            ) : (
              <p className={styles.noSessionText}>현재 진행 중인 수업이 없어요.</p>
            )}
          </div>

          {/* 최근 방문한 세션 */}
          <div className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <h2 className={styles.sectionTitle} style={{ fontSize: '16px' }}>최근 방문한 세션</h2>
            </div>
            <div className={styles.recentList}>
              {recentSessions.length > 0 ? recentSessions.map((item) => {
                const computed = computeSessionStatus(item);
                const badgeType = computed === 'live' ? 'live' : computed === 'upcoming' ? 'wait' : 'done';
                const badgeLabel = computed === 'live' ? '진행 중' : computed === 'upcoming' ? '대기 중' : '종료';
                return (
                  <div
                    key={item.id}
                    className={styles.recentItem}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/s/classes/${item.classId}/sessions/${item.id}`)}
                  >
                    <div className={styles.recentAvatar} />
                    <div className={styles.recentInfo}>
                      <div className={styles.recentTitle}>{item.sessionName}</div>
                      <div className={styles.recentTeacher}>
                        {item.subject}{item.period ? ` | ${item.period}교시` : ''}
                      </div>
                    </div>
                    <span className={`${styles.recentBadge} ${styles[`badge_${badgeType}`]}`}>
                      {badgeLabel}
                    </span>
                  </div>
                );
              }) : (
                <p className={styles.noSessionText}>최근 방문한 세션이 없어요.</p>
              )}
            </div>
            <button className={styles.viewAllBtn} onClick={() => router.push('/s/classes')}>
              전체 보기 &nbsp;→
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
