'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight as ChevronRightIcon, Calendar, Clock, Sparkles, Users, BarChart2, Archive, GraduationCap } from 'lucide-react';
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

const AI_FEEDBACK_ITEMS = [
  {
    category: '내가 막힌 부분',
    title: '영어 지문에서 핵심 문장을 찾는 과정에서 오답률이 높아요.',
    desc: '특히 문맥 속 단어 의미와 글의 흐름을 연결하는 유형에서 어려움을 겪고 있어요.',
  },
  {
    category: '신경쓰면 좋을 점',
    title: '문장의 구조를 먼저 나누어 읽는 습관을 들여보세요.',
    desc: '접속사와 대명사의 연결 관계를 체크하면 독해 정확도가 더 올라갈 거예요.',
  },
  {
    category: '잘하고 있는 점',
    title: '꾸준히 지문을 끝까지 읽어내는 집중력이 정말 좋아졌어요!',
    desc: '조금만 더 자신감을 가지면 영어 독해 실력이 훨씬 빠르게 성장할 거예요 🙂',
  },
];

const NOTICES = [
  { title: '3월 학습 리포트 업데이트 안내', content: '새로운 분석 항목이 추가되었어요.', date: '2026.03.04' },
  { title: '4월 학사 일정 공지', content: '4월 3일(목) 전체 교사 회의가 있습니다.', date: '2026.03.28' },
  { title: '수업 녹화 기능 베타 오픈', content: 'LIVE 세션 중 녹화 버튼이 활성화됩니다.', date: '2026.04.01' },
];

const QUICK_LINKS = [
  { label: '내 클래스 관리', sub: '클래스 및 학생 관리', href: '/s/classes', icon: <Users size={20} color="#22C55E" strokeWidth={1.5} /> },
  { label: '학습 리포트', sub: '성장추이와 집중 분석보기', href: '/s/reports', icon: <BarChart2 size={20} color="#22C55E" strokeWidth={1.5} /> },
  { label: '학습 아카이브', sub: '지난 수업 기록과 대화 확인', href: '/s/classes', icon: <Archive size={20} color="#22C55E" strokeWidth={1.5} /> },
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

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, classes: _classes, todayClass, recentSessions = [] }) => {
  const router = useRouter();
  const [noticeIdx, setNoticeIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNoticeIdx((i) => (i + 1) % NOTICES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const notice = NOTICES[noticeIdx];

  return (
    <div className={styles.container}>
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
          <div className={styles.progressCardContent}>
            <div>
              <div className={styles.progressNumRow}>
                <span className={styles.progressNum}>78</span>
                <span className={styles.progressUnit}>%</span>
              </div>
              <div className={styles.progressMeta}>
                <span className={styles.progressLabel}>지난주 대비</span>
                <span className={styles.progressDelta}>▲ 6%p</span>
              </div>
            </div>
            <div className={styles.progressRing}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#EBEBEA" strokeWidth="6" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#22CB84" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 22 * 0.78} ${2 * Math.PI * 22}`}
                  strokeLinecap="round" transform="rotate(-90 28 28)" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.aiInsightCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>AI 학습 피드백 요약</h2>
                <p className={styles.sectionSubtitle}>최근 학습 데이터를 분석했어요.</p>
              </div>
              <button className={styles.detailBtn} onClick={() => router.push('/s/reports')}>
                상세보기 <ChevronRight />
              </button>
            </div>

            <div className={styles.feedbackList}>
              {AI_FEEDBACK_ITEMS.map((item, i) => (
                <div className={styles.feedbackCard} key={i}>
                  <div className={styles.feedbackIcon}>
                    <Sparkles size={28} color="#22CB84" strokeWidth={1.5} />
                  </div>
                  <div className={styles.feedbackBody}>
                    <span className={styles.feedbackCategory}>{item.category}</span>
                    <p className={styles.feedbackTitle}>{item.title}</p>
                    <p className={styles.feedbackDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.quickLinksCard}>
            <h3 className={styles.listTitle}>바로가기</h3>
            <div className={styles.quickLinksGrid}>
              {QUICK_LINKS.map((link, i) => (
                <React.Fragment key={link.label}>
                  <Link href={link.href} style={{ textDecoration: 'none' }}>
                    <div className={styles.quickLinkItem}>
                      <div className={styles.quickLinkIcon}>{link.icon}</div>
                      <div className={styles.quickLinkText}>
                        <span className={styles.quickLinkTitle}>{link.label}</span>
                        <span className={styles.quickLinkSub}>{link.sub}</span>
                      </div>
                    </div>
                  </Link>
                  {i < QUICK_LINKS.length - 1 && <div className={styles.quickDivider} />}
                </React.Fragment>
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
            <StudentTodayClassContent todayClass={todayClass} />
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
                    onClick={() => router.push(`/s/classes/${item.classId}/sessions/${item.id}`)}
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

