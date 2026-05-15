'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight as ChevronRightIcon, Calendar, Clock, User, Users, BarChart2, Archive, Video, GraduationCap } from 'lucide-react';
import styles from './Dashboard.module.css';
import type { RecentSessionInfo } from '@/app/t/home/page';
import { computeSessionStatus } from '@/utils/sessionStatus';

const NOTICES = [
  { title: '3월 학습 리포트 업데이트 안내', content: '새로운 분석 항목이 추가되었어요.', date: '2026.03.04' },
  { title: '4월 학사 일정 공지', content: '4월 3일(목) 전체 교사 회의가 있습니다.', date: '2026.03.28' },
  { title: '수업 녹화 기능 베타 오픈', content: 'LIVE 세션 중 녹화 버튼이 활성화됩니다.', date: '2026.04.01' },
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
  recentSessions?: RecentSessionInfo[];
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
const ChevronRight = () => <ChevronRightIcon size={18} strokeWidth={2.5} />;

/* ── 통합 카드 컴포넌트 ───────────────────────────────────── */
function TodayClassContent({ todayClass }: { todayClass?: TodayClass }) {
  const router = useRouter();
  if (!todayClass) {
    return (
      <div className={styles.emptyBody}>
        <div className={styles.emptyIcon}>
          <Calendar size={32} strokeWidth={1.5} />
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
            <Clock size={18} />
            <span>{todayClass.period}교시</span>
          </div>
          <div className={styles.statItem}>
            <User size={18} />
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

export const Dashboard: React.FC<DashboardProps> = ({ classes, todayClass, recentSessions = [] }) => {
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

  const router = useRouter();

  return (
    <div className={styles.container}>
      {/* ... keeping the existing JSX for topSection and leftColumn ... */}
      <div className={styles.topSection}>
        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
            <div className={styles.topCardRow}>
              <h3 className={styles.cardTitle}>공지사항</h3>
              <a href="#" className={styles.moreLink}>더보기 &gt;</a>
            </div>
            <p className={styles.cardSubtitle}>{notice.title}</p>
            <p className={styles.cardDate}>{notice.content}</p>
          </div>
          <p className={styles.noticeDate}>{notice.date}</p>
        </div>

        <div className={styles.topCard}>
          <div className={styles.topCardContent}>
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
              <button className={styles.reportBtn} onClick={() => router.push('/t/reports')}>전체 분석 리포트로 이동 <ChevronRightIcon size={14} /></button>
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
              {[
                { href: '/t/classes', title: '내 클래스 관리', sub: '클래스 및 학생 관리', icon: <Users size={20} color="#22C55E" strokeWidth={1.5} /> },
                { href: '/t/reports', title: '학습 리포트', sub: '성장추이와 집중 분석보기', icon: <BarChart2 size={20} color="#22C55E" strokeWidth={1.5} /> },
                { href: '/t/classes', title: '학습 아카이브', sub: '지난 수업 기록과 대화 확인', icon: <Archive size={20} color="#22C55E" strokeWidth={1.5} /> },
                { href: '/t/classes', title: '수업 세션', sub: '세션 생성 및 관리', icon: <Video size={20} color="#22C55E" strokeWidth={1.5} /> },
              ].map((item, i, arr) => (
                <div key={item.title} className={styles.quickLinkWrapper}>
                  <Link href={item.href} style={{ textDecoration: 'none' }}>
                    <div className={styles.quickLinkItem}>
                      <div className={styles.quickLinkIcon}>{item.icon}</div>
                      <div className={styles.quickLinkText}>
                        <span className={styles.quickLinkTitle}>{item.title}</span>
                        <span className={styles.quickLinkSub}>{item.sub}</span>
                      </div>
                    </div>
                  </Link>
                  {i < arr.length - 1 && <div className={styles.quickDivider} />}
                </div>
              ))}
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
            <TodayClassContent todayClass={todayClass} />
          </div>

          <div className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <h2 className={styles.sectionTitle} style={{ fontSize: 'var(--font-size-h3)' }}>최근 방문한 세션</h2>
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
                    onClick={() => router.push(`/t/classes/${item.classId}/sessions/${item.id}`)}
                  >
                    <div className={styles.recentAvatar}><GraduationCap size={18} color="#22C55E" strokeWidth={1.5} /></div>
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
                <p className={styles.emptySubtitle}>최근 방문한 세션이 없어요.</p>
              )}
            </div>
            <button className={styles.viewAllBtn} onClick={() => router.push('/t/classes')}>
              전체 보기 &nbsp;→
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
