'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight as ChevronRightIcon, Calendar, Clock, Bell, Activity, BookOpen, LayoutGrid } from 'lucide-react';
import styles from './StudentDashboard.module.css';
import type { RecentSessionInfo, TodayClassData } from '@/app/s/home/page';
import { computeSessionStatus } from '@/utils/sessionStatus';

interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
}

interface StudentDashboardProps {
  user: { name: string } | null;
  classes: ClassItem[];
  todayClass?: TodayClassData;
  recentSessions?: RecentSessionInfo[];
}

const FEEDBACK_ITEMS = [
  '영어 수업 참여도가 지난주보다 12% 향상되었어요.',
  '수학 퀴즈 정답률이 평균보다 낮아요. 복습이 필요해요.',
  '국어 토론 참여 빈도가 꾸준히 증가하고 있어요.',
];

const PROGRESS_ALERTS = [
  { count: '78%', desc: '지난주 대비 6%p 상승했어요.' },
  { count: '82%', desc: '영어 단어 퀴즈 정답률이 많이 올랐어요.' },
  { count: '100%', desc: '이번 주 과제를 모두 제출했어요!' },
];

/* ── 상태별 설정 맵 ──────────────────────────────────────── */
type TodayClassStatus = 'upcoming' | 'live' | 'completed';

const STATUS_CONFIG: Record<
  TodayClassStatus,
  { tag: string; getLabel: (period: number) => string; btnText: string }
> = {
  upcoming:  { tag: '예정',  getLabel: (p) => `${p}교시 수업 예정`, btnText: '수업 준비하기' },
  live:      { tag: 'LIVE', getLabel: ()  => '진행중',              btnText: '실시간 참여하기' },
  completed: { tag: '완료',  getLabel: ()  => '오늘 수업 완료',      btnText: '내 리포트 보기' },
};

const ChevronRight = () => <ChevronRightIcon size={18} strokeWidth={2.5} />;

function StudentTodayClassContent({ todayClass }: { todayClass?: TodayClassData }) {
  const router = useRouter();
  if (!todayClass) {
    return (
      <div className={styles.emptyBody}>
        <div className={styles.emptyIcon}>
          <Calendar size={32} strokeWidth={1.5} />
        </div>
        <p className={styles.emptyTitle}>오늘은 예정된 수업이 없어요.</p>
        <p className={styles.emptySubtitle}>선생님이 클래스를 열면 여기에 표시돼요.</p>
        <Link href="/s/classes" className={styles.secondaryBtn}>클래스 관리하기</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[todayClass.status];

  return (
    <>
      <div className={styles.todayClassBox} data-status={todayClass.status}>
        <div className={styles.statusRow}>
          <span className={styles.statusTag}>{cfg.tag}</span>
          <span className={styles.statusLabel}>{cfg.getLabel(todayClass.period)}</span>
        </div>

        <h3 className={styles.className}>
          {todayClass.className} {todayClass.subject}
        </h3>

        <div className={styles.classStats}>
          <div className={styles.statItem}>
            <Clock size={18} />
            <span>{todayClass.period}교시</span>
          </div>
        </div>

        <button
          className={styles.cardActionBtn}
          onClick={() => {
            if (todayClass.sessionId && todayClass.classId) {
              router.push(`/s/classes/${todayClass.classId}/sessions/${todayClass.sessionId}`);
            }
          }}
        >
          <span style={{ width: 18 }} />
          <span>{cfg.btnText}</span>
          <ChevronRight />
        </button>
      </div>
    </>
  );
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, classes, todayClass, recentSessions = [] }) => {
  const router = useRouter();
  const [alertIdx, setAlertIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAlertIdx((i) => (i + 1) % PROGRESS_ALERTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const progressAlert = PROGRESS_ALERTS[alertIdx];

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.iconCircle}>
              <Bell size={20} color="#10b981" />
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

        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.iconCircle}>
              <Activity size={20} color="#10b981" />
            </div>
            <div>
              <h3 className={styles.cardTitle}>나의 학습 진도 <span className={styles.highlightCount}>{progressAlert.count}</span></h3>
              <p className={styles.cardSubtitle}>{progressAlert.desc}</p>
            </div>
          </div>
          <div className={styles.dotRow}>
            {PROGRESS_ALERTS.map((_, i) => <span key={i} className={i === alertIdx ? styles.dotActive : styles.dot} />)}
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.aiInsightCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>주간 AI 인사이트 요약</h2>
                <p className={styles.sectionSubtitle}>최근 7일간 나의 학습 데이터를 분석했어요.</p>
              </div>
              <button className={styles.reportBtn} onClick={() => router.push('/s/reports')}>전체 분석 리포트로 이동 &gt;</button>
            </div>

            <div className={styles.aiContent}>
              <div className={styles.chartArea}>
                <h3 className={styles.chartTitle}>나의 종합 참여도</h3>
                <div className={styles.donutWrapper}>
                  <div className={styles.donutCircle}></div>
                  <div className={styles.donutText}>78<span className={styles.donutSmall}>%</span></div>
                </div>
                <div className={styles.chartFooter}></div>
              </div>

              <div className={styles.listsArea}>
                <div>
                  <h3 className={styles.listTitle}>이번 주 피드백</h3>
                  {FEEDBACK_ITEMS.map((item, i) => (
                    <div className={styles.listItem} key={i}>
                      <span className={styles.listRank}>{i + 1}</span>
                      <span className={styles.listName}>{item}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '16px' }}>
                  <h3 className={styles.listTitle}>도움이 필요한 과목 Top 3</h3>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>1</span>
                    <span className={styles.listName}>수학</span>
                    <span className={styles.listReason}>퀴즈 정답률 낮음</span>
                    <span className={styles.badge}>관심필요</span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>2</span>
                    <span className={styles.listName}>과학</span>
                    <span className={styles.listReason}>실험 보고서 미제출</span>
                    <span className={styles.badge}>관심필요</span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>3</span>
                    <span className={styles.listName}>역사</span>
                    <span className={styles.listReason}>참여도 저조</span>
                    <span className={styles.badge}>관심필요</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.quickLinksCard}>
            <h3 className={styles.listTitle}>바로가기</h3>
            <div className={styles.quickLinksGrid}>
              {classes.slice(0, 5).map((cls) => (
                <Link href={`/s/classes/${cls.id}`} key={cls.id} style={{ textDecoration: 'none' }}>
                  <div className={styles.quickLinkItem}>
                    <div className={styles.quickLinkIcon}>
                      <BookOpen size={20} color="#10b981" />
                    </div>
                    <div className={styles.quickLinkText}>
                      <span className={styles.quickLinkTitle}>{cls.subject}</span>
                      <span className={styles.quickLinkSub}>
                        {cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? ''}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {classes.length === 0 && (
                <Link href="/s/classes" style={{ textDecoration: 'none' }}>
                  <div className={styles.quickLinkItem}>
                    <div className={styles.quickLinkIcon}>
                      <LayoutGrid size={20} color="#64748b" />
                    </div>
                    <div className={styles.quickLinkText}>
                      <span className={styles.quickLinkTitle}>클래스 참여하기</span>
                      <span className={styles.quickLinkSub}>초대 코드로 입장</span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.classCard}>
            <div className={styles.classHeader}>
              <div>
                <h2 className={styles.sectionTitle}>오늘의 클래스</h2>
                <p className={styles.sectionSubtitle}>실시간 현황 및 예정 수업</p>
              </div>
            </div>
            <StudentTodayClassContent todayClass={todayClass} />
          </div>

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

