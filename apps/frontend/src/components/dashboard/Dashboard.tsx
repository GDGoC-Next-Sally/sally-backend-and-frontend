'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Dashboard.module.css';

const NOTICES = [
  { text: '3월 학습 리포트 업데이트 안내\n새로운 분석 항목이 추가되었어요.', date: '2026.03.04' },
  { text: '4월 학사 일정 공지\n4월 3일(목) 전체 교사 회의가 있습니다.', date: '2026.03.28' },
  { text: '수업 녹화 기능 베타 오픈\nLIVE 세션 중 녹화 버튼이 활성화됩니다.', date: '2026.04.01' },
];

const STUDENT_ALERTS = [
  { count: 3, desc: '지난 7일간 멘션 요청 3건이 발생했어요.' },
  { count: 1, desc: '김고대 학생이 3일 연속 참여도가 낮아요.' },
  { count: 2, desc: '이민준, 박서연 학생 퀴즈 정답률이 50% 미만이에요.' },
];

interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
}

type TodayClassStatus = 'upcoming' | 'live' | 'completed';

interface TodayClass {
  status: TodayClassStatus;
  className: string;
  subject: string;
  period: number;
  studentCount?: number;
  aiNote?: string;
  sessionId?: number;
  classId?: number;
}

interface DashboardProps {
  classes: ClassItem[];
  todayClass?: TodayClass;
}

/* ── 상태별 설정 맵 ──────────────────────────────────────── */
const STATUS_CONFIG: Record<
  TodayClassStatus,
  { tag: string; getLabel: (period: number) => string; btnText: string }
> = {
  upcoming:  { tag: '예정',  getLabel: (p) => `${p}교시 수업 예정`, btnText: '수업 준비하기' },
  live:      { tag: 'LIVE', getLabel: ()  => '진행중',              btnText: '실시간 관찰 및 코칭' },
  completed: { tag: '완료',  getLabel: ()  => '오늘 수업 완료',      btnText: '수업 리포트 보기' },
};

/* ── 화살표 아이콘 ────────────────────────────────────────── */
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ── 통합 카드 컴포넌트 ───────────────────────────────────── */
function TodayClassContent({ todayClass }: { todayClass?: TodayClass }) {
  const router = useRouter();
  if (!todayClass) {
    return (
      <div className={styles.emptyBody}>
        <div className={styles.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>오늘은 예정된 수업이 없어요.</p>
        <p className={styles.emptySubtitle}>클래스를 등록하면 여기에 표시돼요.</p>
        <Link href="/t/classes" className={styles.secondaryBtn}>클래스 관리하기</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[todayClass.status];

  return (
    <>
      <div className={styles.todayClassBox} data-status={todayClass.status}>
        {/* 상태 태그 행 */}
        <div className={styles.statusRow}>
          <span className={styles.statusTag}>{cfg.tag}</span>
          <span className={styles.statusLabel}>{cfg.getLabel(todayClass.period)}</span>
        </div>

        {/* 클래스명 (반 + 과목) */}
        <h3 className={styles.className}>
          {todayClass.className} {todayClass.subject}
        </h3>

        {/* 교시 + 인원수 */}
        <div className={styles.classStats}>
          <div className={styles.statItem}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{todayClass.period}교시</span>
          </div>
          <div className={styles.statItem}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{todayClass.studentCount ?? '—'}</span>
          </div>
        </div>

        {/* 동작 버튼 */}
        <button
          className={styles.cardActionBtn}
          onClick={() => {
            if (todayClass.sessionId && todayClass.classId) {
              router.push(`/t/classes/${todayClass.classId}/sessions/${todayClass.sessionId}`);
            }
          }}
        >
          <span style={{ width: 18 }} />
          <span>{cfg.btnText}</span>
          <ChevronRight />
        </button>
      </div>

      {/* live 전용 AI 메모 */}
      {todayClass.status === 'live' && todayClass.aiNote && (
        <div className={styles.classNote}>
          <span className={styles.noteHighlight}>✦</span>
          <span>{todayClass.aiNote}</span>
        </div>
      )}
    </>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({ classes, todayClass }) => {
  const [noticeIdx, setNoticeIdx] = useState(0);
  const [alertIdx, setAlertIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNoticeIdx((i) => (i + 1) % NOTICES.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAlertIdx((i) => (i + 1) % STUDENT_ALERTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const notice = NOTICES[noticeIdx];
  const alert = STUDENT_ALERTS[alertIdx];

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>공지사항</h3>
              <p className={styles.cardSubtitle}>{notice.text.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}</p>
            </div>
          </div>
          <div>
            <div className={styles.dotRow}>
              {NOTICES.map((_, i) => <span key={i} className={i === noticeIdx ? styles.dotActive : styles.dot} />)}
            </div>
            <p className={styles.cardDate}>{notice.date}</p>
          </div>
        </div>

        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.iconCircle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>도움이 필요한 학생 <span className={styles.highlightCount}>{alert.count}</span></h3>
              <p className={styles.cardSubtitle}>{alert.desc}</p>
            </div>
          </div>
          <div className={styles.dotRow}>
            {STUDENT_ALERTS.map((_, i) => <span key={i} className={i === alertIdx ? styles.dotActive : styles.dot} />)}
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.aiInsightCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>주간 AI 인사이트 요약</h2>
                <p className={styles.sectionSubtitle}>최근 7일간 우리 반 학습 데이터를 분석했어요.</p>
              </div>
              <button className={styles.reportBtn}>전체 분석 리포트로 이동 &gt;</button>
            </div>

            <div className={styles.aiContent}>
              <div className={styles.chartArea}>
                <h3 className={styles.chartTitle}>클래스 평균 참여도</h3>
                <div className={styles.donutWrapper}>
                  <div className={styles.donutCircle}></div>
                  <div className={styles.donutText}>78<span className={styles.donutSmall}>%</span></div>
                </div>
                <div className={styles.chartFooter}></div>
              </div>

              <div className={styles.listsArea}>
                <div>
                  <h3 className={styles.listTitle}>가장 참여도가 높은 클래스</h3>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>1</span>
                    <span className={styles.listName}>3학년 2반</span>
                    <div className={styles.progressBar}><div className={styles.progressFill}></div></div>
                    <span className={styles.progressText}>86%</span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>2</span>
                    <span className={styles.listName}>3학년 2반</span>
                    <div className={styles.progressBar}><div className={styles.progressFill}></div></div>
                    <span className={styles.progressText}>86%</span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>3</span>
                    <span className={styles.listName}>3학년 2반</span>
                    <div className={styles.progressBar}><div className={styles.progressFill}></div></div>
                    <span className={styles.progressText}>86%</span>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <h3 className={styles.listTitle}>도움이 필요한 학생 Top 3</h3>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>1</span>
                    <span className={styles.listName}>김고대</span>
                    <span className={styles.listName}>3학년 2반</span>
                    <span className={styles.listReason}>과제 미제출 2회 연속</span>
                    <span className={styles.badge}>관심필요</span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>2</span>
                    <span className={styles.listName}>김고대</span>
                    <span className={styles.listName}>3학년 2반</span>
                    <span className={styles.listReason}>퀴즈 정답률 낮음</span>
                    <span className={styles.badge}>관심필요</span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listRank}>3</span>
                    <span className={styles.listName}>김고대</span>
                    <span className={styles.listName}>3학년 2반</span>
                    <span className={styles.listReason}>수업 참여도 낮음</span>
                    <span className={styles.badge}>관심필요</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.quickLinksCard}>
            <h3 className={styles.listTitle}>바로가기</h3>
            <div className={styles.quickLinksGrid}>
              {/* Actual connected classes */}
              {classes.slice(0, 5).map((cls) => (
                <Link href={`/t/classes/${cls.id}`} key={cls.id} style={{ textDecoration: 'none' }}>
                  <div className={styles.quickLinkItem}>
                    <div className={styles.quickLinkIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
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
                <Link href="/t/classes" style={{ textDecoration: 'none' }}>
                  <div className={styles.quickLinkItem}>
                    <div className={styles.quickLinkIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <div className={styles.quickLinkText}>
                      <span className={styles.quickLinkTitle}>내 클래스 관리</span>
                      <span className={styles.quickLinkSub}>전체 목록 보기</span>
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
              <span className={styles.classDate}>5월 8일 목요일</span>
            </div>
            <TodayClassContent todayClass={todayClass} />
          </div>
        </div>
      </div>
    </div>
  );
};
