'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api';
import styles from './Dashboard.module.css';

interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
}

export const Dashboard = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    fetchWithAuth('/classes/teacher')
      .then((data) => setClasses(data || []))
      .catch(() => setClasses([]));
  }, []);

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
              <p className={styles.cardSubtitle}>3월 학습 리포트 업데이트 안내<br/>새로운 분석 항목이 추가되었어요.</p>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>도움이 필요한 학생 <span className={styles.highlightCount}>3</span></h3>
              <p className={styles.cardSubtitle}>지난 7일간 멘션 요청 3건이 발생했어요.</p>
            </div>
          </div>
          <a href="#" className={styles.moreLink}>더보기 &gt;</a>
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
              {classes.slice(0, 4).map((cls) => (
                <Link href={`/t/classes/${cls.id}`} key={cls.id} style={{ textDecoration: 'none' }}>
                  <div className={styles.quickLinkItem}>
                    <div className={styles.quickLinkIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
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
              
              {/* Default "Manage My Classes" if empty or for the remaining slots */}
              {(classes.length === 0 || classes.length < 4) && (
                <Link href="/t/classes" style={{ textDecoration: 'none' }}>
                  <div className={styles.quickLinkItem}>
                    <div className={styles.quickLinkIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
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
              <span className={styles.classDate}>5월 20일 수요일</span>
            </div>

            <div className={styles.activeClassBox}>
              <div>
                <span className={styles.liveTag}>LIVE</span>
                <span className={styles.liveText}>진행 중인 수업</span>
              </div>
              <h3 className={styles.className}>3학년 2반</h3>
              <div className={styles.classStats}>
                <div className={styles.statItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>5교시</span>
                </div>
                <div className={styles.statItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>28</span>
                </div>
              </div>
              <button className={styles.primaryBtn}>
                실시간 관찰 및 코칭 &gt;
              </button>
            </div>

            <div className={styles.classNote}>
              <span className={styles.noteHighlight}>✦</span>
              <span>수업 참여도가 평소보다 높아요!<br/>지금의 흐름을 유지하며 코칭해보세요.</span>
            </div>
          </div>

          <div className={styles.emptyClassCard}>
            <div className={styles.classHeader}>
              <h2 className={styles.sectionTitle}>오늘의 클래스</h2>
              <span className={styles.classDate}>5월 20일 수요일</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
