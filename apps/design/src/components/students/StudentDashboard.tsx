'use client';

import React from 'react';
import styles from './StudentDashboard.module.css';
import type { ClassItem, RecentSession, LiveClass, ProgressData, User } from '@/mock/types';

// ─── Props contract ────────────────────────────────────────────────────────────
// Downstream real app: fetch `classes`, `recentSessions`, `progress`, and
// `todayClass` from your server actions / API and pass them here as props.
// The component has zero internal data fetching.
interface StudentDashboardProps {
  user: Pick<User, 'name'>;
  classes: ClassItem[];
  recentSessions: RecentSession[];
  progress: ProgressData;
  todayClass?: LiveClass;
  /** Base path for student routes */
  basePath?: string;
}

export const StudentDashboard = ({
  user,
  classes,
  recentSessions,
  progress,
  todayClass,
  basePath = '/s',
}: StudentDashboardProps) => {
  const progressDash = Math.round((progress.value / 100) * 100.53); // circumference ratio

  return (
    <div className={styles.container}>
      <div className={styles.layout}>

        {/* ── Left column ────────────────────────────────────────────────── */}
        <div className={styles.leftCol}>
          <div className={styles.topRow}>

            {/* 공지사항 */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>공지사항</span>
                <button className={styles.moreBtn}>더보기 →</button>
              </div>
              <div className={styles.noticeItem}>
                <span className={styles.noticeText}>3월 학습 리포트 업데이트 안내</span>
                <span className={styles.noticeDate}>2026.03.04</span>
              </div>
              <p className={styles.noticeSub}>새로운 분석 항목이 추가되었어요.</p>
            </div>

            {/* 나의 학습 진도 */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>나의 학습 진도</span>
              </div>
              <div className={styles.progressRow}>
                <div>
                  <div className={styles.progressValue}>
                    {progress.value}<span className={styles.pct}>%</span>
                  </div>
                  <div className={styles.progressDelta}>
                    지난주 대비{' '}
                    <span className={styles.up}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#22C55E" style={{ verticalAlign: 'middle', marginRight: '2px' }}>
                        <path d="M12 3l9 18H3z" />
                      </svg>
                      {progress.delta}%p
                    </span>
                  </div>
                </div>
                <svg viewBox="0 0 36 36" width="80" height="80">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EBEBEA" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#22C55E" strokeWidth="3"
                    strokeDasharray={`${progress.value} ${100 - progress.value}`}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* AI 피드백 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>AI 학습 피드백 요약</span>
              <button className={styles.detailBtn}>
                상세보기
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <p className={styles.feedbackSub}>최근 학습 데이터를 분석했어요.</p>
          </div>

          {/* 바로가기 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>바로가기</span>
            </div>
            <div className={styles.shortcutGrid}>
              {classes.slice(0, 4).map((cls) => (
                <a
                  key={cls.id}
                  href={`${basePath}/classes/${cls.id}`}
                  className={styles.shortcutItem}
                >
                  <div className={styles.shortcutIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <span className={styles.shortcutLabel}>{cls.subject}</span>
                  <span className={styles.shortcutSub}>{cls.grade}학년 {cls.homeroom}</span>
                </a>
              ))}
              {Array.from({ length: Math.max(0, 4 - classes.length) }).map((_, i) => (
                <a
                  key={`ph-${i}`}
                  href={`${basePath}/classes`}
                  className={`${styles.shortcutItem} ${styles.shortcutPlaceholder}`}
                >
                  <div className={styles.shortcutIcon} />
                  <span className={styles.shortcutLabel}>내 클래스 관리</span>
                  <span className={styles.shortcutSub}>클래스 및 학생 관리</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────────────── */}
        <div className={styles.rightCol}>

          {/* 오늘의 클래스 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>오늘의 클래스</span>
              <span className={styles.dateLabel}>
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
            </div>
            <p className={styles.todaySub}>실시간 현황 및 예정 수업</p>

            {todayClass ? (
              <div className={styles.liveCard}>
                <div className={styles.liveBadgeRow}>
                  <span className={styles.liveBadge}>LIVE</span>
                  <span className={styles.liveSubLabel}>진행 중인 수업</span>
                </div>
                <div className={styles.liveTitle}>{todayClass.subject}</div>
                <div className={styles.liveMeta}>
                  <span>⏱ {todayClass.period}교시</span>
                  <span>👥 {todayClass.studentCount}</span>
                </div>
                <a href={`${basePath}/classes`} className={styles.joinBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  참여하기
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className={styles.noClassCard}>진행 중인 수업이 없습니다.</div>
            )}

            <p className={styles.motivationText}>✦ 오늘도 즐거운 배움의 하루가 되세요!</p>
          </div>

          {/* 최근 방문한 세션 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>최근 방문한 세션</span>
              <span className={styles.dateLabel}>
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
            </div>
            <div className={styles.recentList}>
              {recentSessions.map((item, i) => (
                <div key={i} className={styles.recentItem}>
                  <div className={styles.recentAvatar} />
                  <div className={styles.recentInfo}>
                    <div className={styles.recentTitle}>{item.title}</div>
                    <div className={styles.recentTeacher}>{item.teacher}</div>
                  </div>
                  <span className={`${styles.recentBadge} ${styles[`badge_${item.type}`]}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <a href={`${basePath}/classes`} className={styles.viewAllBtn}>
              전체 보기 &nbsp;→
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
