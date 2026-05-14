'use client';

import React, { useState } from 'react';
import { Download, BookOpen, Lightbulb, Smile, MessageSquare, FileSearch } from 'lucide-react';
import type { SessionListItem } from '@/actions/reports';
import { ReportExportModal } from './ReportExportModal';
import styles from './StudentReport.module.css';

/* ── 타입 ────────────────────────────────────────────────────────────────── */

export interface StudentReportContent {
  key_concepts?: {
    main_concepts?: string[];
    weak_concepts?: string[];
  };
  misconception_summary?: string[];
  session_summary?: string;
  detailed_report?: string;
}

export interface StudentReportProps {
  sessions: SessionListItem[];
  selectedSessionId: number | null;
  report: StudentReportContent | null;
  isLoading: boolean;
  studentName: string;
  onSessionChange: (id: number) => void;
}

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────────── */

export function StudentReport({
  sessions,
  selectedSessionId,
  report,
  isLoading,
  studentName,
  onSessionChange,
}: StudentReportProps) {
  const [reportExpanded, setReportExpanded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId);

  const weakConcepts = report?.key_concepts?.weak_concepts?.filter(c => c !== '없음') ?? [];
  const misconceptions = report?.misconception_summary?.filter(c => c !== '없음') ?? [];
  const mainConcept = report?.key_concepts?.main_concepts?.filter(c => c !== '없음')[0] ?? '';
  const sessionSummary = report?.session_summary ?? '';
  const detailedReport = report?.detailed_report ?? '';

  const classLabel = selectedSession
    ? `${selectedSession.subject} · ${selectedSession.teacherName} 선생님`
    : '';

  const sessionLabel = (s: SessionListItem) => {
    if (!s.finishedAt) return s.sessionName;
    const d = new Date(s.finishedAt);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · ${s.sessionName}`;
  };

  return (
    <>
    {showExportModal && <ReportExportModal onClose={() => setShowExportModal(false)} />}
    <div className={styles.whiteBg}>
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>AI 분석 리포트</h1>
        <div className={styles.headerBtns}>
          <button className={styles.chatBtn}>
            채팅방 보기
          </button>
          <button className={styles.exportBtn} onClick={() => setShowExportModal(true)}>
            내보내기
            <Download size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 세션 선택 */}
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={selectedSessionId ?? ''}
          onChange={e => onSessionChange(Number(e.target.value))}
          disabled={sessions.length === 0}
        >
          {sessions.length === 0 && <option value="">종료된 세션이 없습니다</option>}
          {sessions.map(s => (
            <option key={s.sessionId} value={s.sessionId}>{sessionLabel(s)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className={styles.emptyCard}>
          <div className={styles.skeletonLine} style={{ width: '60%', margin: '0 auto 12px' }} />
          <div className={styles.skeletonLine} style={{ width: '40%', margin: '0 auto' }} />
        </div>
      ) : !selectedSessionId ? (
        <div className={styles.emptyCard}>세션을 선택하면 리포트가 표시됩니다.</div>
      ) : !report ? (
        <div className={styles.reportGenerating}>
          <FileSearch size={120} strokeWidth={1} color="#22CB84" />
          <p className={styles.reportGenTitle}>리포트 생성 중...</p>
          <p className={styles.reportGenSub}>리포트가 생성 중입니다. 조금만 기다려주세요.</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
          </div>
        </div>
      ) : (
        <>
          {/* 프로필 카드 */}
          <div className={styles.profileCard}>
            <div className={styles.profileLeft}>
              <div className={styles.avatar} />
              <div>
                <div className={styles.profileName}>{studentName || '나'}</div>
                {classLabel && <div className={styles.profileClass}>{classLabel}</div>}
              </div>
            </div>
            <div className={styles.profileStats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>참여도</span>
                <div className={styles.statValueRow}>
                  <BookOpen size={24} strokeWidth={1.5} color="#626664" />
                  <span className={styles.statNum}>—</span>
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>이해도</span>
                <div className={styles.statValueRow}>
                  <Lightbulb size={24} strokeWidth={1.5} color="#626664" />
                  <span className={styles.statNum}>—</span>
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>주요 감정</span>
                <div className={styles.statValueRow}>
                  <Smile size={24} strokeWidth={1.5} color="#626664" />
                  <span className={styles.statNum}>—</span>
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>개입 횟수</span>
                <div className={styles.statValueRow}>
                  <MessageSquare size={24} strokeWidth={1.5} color="#626664" />
                  <span className={styles.statNum}>—</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2컬럼 */}
          <div className={styles.twoCol}>
            {/* 왼쪽 */}
            <div className={styles.leftCol}>
              {/* 학습 주제 */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>학습 주제</h3>
                <p className={styles.cardValue}>{mainConcept || '—'}</p>
              </div>

              {/* 타임라인 + AI 상태요약 */}
              <div className={styles.card}>
                <div className={styles.timelineHeader}>
                  <h3 className={styles.cardTitle} style={{ margin: 0 }}>주요 타임라인</h3>
                </div>
                <p className={styles.empty}>타임라인 데이터가 없습니다.</p>
                {sessionSummary && (
                  <div className={styles.aiBox}>
                    <div className={styles.aiBoxTitle}>
                      <span className={styles.aiStar}>✦</span>
                      <span>AI 상태요약</span>
                    </div>
                    <p className={styles.aiText}>{sessionSummary}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽 */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>반복오개념</h3>
              <div className={styles.misconceptionList}>
                {weakConcepts.length === 0 ? (
                  <p className={styles.empty}>오개념 없음</p>
                ) : weakConcepts.map((c, i) => (
                  <div key={i} className={styles.misconceptionItem}>
                    <span className={styles.misconceptionRank}>{i + 1}</span>
                    <span className={styles.misconceptionText}>{c}</span>
                  </div>
                ))}
              </div>
              {misconceptions.length > 0 && (
                <div className={styles.aiBox}>
                  <div className={styles.aiBoxTitle}>
                    <span className={styles.aiStar}>✦</span>
                    <span>AI 약점체크</span>
                  </div>
                  <p className={styles.aiText}>{misconceptions.join(' ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI 리포트 */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>AI 리포트</h3>
            {detailedReport ? (
              <>
                <p className={`${styles.reportText} ${reportExpanded ? '' : styles.clampText}`}>
                  {detailedReport}
                </p>
                <button className={styles.viewMoreBtn} onClick={() => setReportExpanded(v => !v)}>
                  {reportExpanded ? '접기' : '자세히 보기'}
                </button>
              </>
            ) : (
              <p className={styles.empty}>아직 리포트가 생성되지 않았습니다.</p>
            )}
          </div>
        </>
      )}
    </div>
    </div>
    </>
  );
}
