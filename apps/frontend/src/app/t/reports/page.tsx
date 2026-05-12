'use client';

import { useState, useEffect } from 'react';
import { getTeacherClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { getSessionStudentReports, getSessionSummaryReport } from '@/actions/reports';
import styles from './reports.module.css';

interface SessionEntry {
  session: Session;
  cls: ClassItem;
}

interface StudentReport {
  studentId: string;
  studentName: string;
  understanding_score?: number;
  weak_concepts?: string[];
  key_questions?: string[];
  summary?: string;
  engagement_level?: string;
}

interface KeyQuestion {
  topic?: string;
  question: string;
}

interface SummaryReport {
  average_understanding?: number;
  top_weak_concepts?: string[];
  key_questions?: string[] | KeyQuestion[];
  overall_summary?: string;
  ai_report?: string;
  total_students?: number;
}

function parseQuestion(raw: string | KeyQuestion): KeyQuestion {
  if (typeof raw === 'object') return raw;
  // "주제: 질문" 형식 파싱 시도
  const colonIdx = raw.indexOf(':');
  if (colonIdx > 0 && colonIdx < 20) {
    return { topic: raw.slice(0, colonIdx).trim(), question: raw.slice(colonIdx + 1).trim() };
  }
  return { question: raw };
}

export default function TeacherReportsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'students'>('summary');
  const [aiReportExpanded, setAiReportExpanded] = useState(false);

  // 클래스 목록 로드
  useEffect(() => {
    getTeacherClasses()
      .then(cls => {
        setClasses(cls);
        if (cls.length > 0) setSelectedClassId(cls[0].id);
      })
      .catch(() => setClasses([]))
      .finally(() => setIsLoading(false));
  }, []);

  // 선택된 클래스의 세션 로드
  useEffect(() => {
    if (!selectedClassId) return;
    setSelectedSessionId(null);
    setSummaryReport(null);
    setStudentReports([]);
    getSessionsByClass(selectedClassId)
      .then(ss => {
        const finished = ss
          .filter(s => s.finished_at)
          .sort((a, b) => (b.finished_at ?? '').localeCompare(a.finished_at ?? ''));
        const cls = classes.find(c => c.id === selectedClassId)!;
        const entries = finished.map(s => ({ session: s, cls }));
        setSessions(entries);
        if (entries.length > 0) setSelectedSessionId(entries[0].session.id);
      })
      .catch(() => setSessions([]));
  }, [selectedClassId, classes]);

  // 리포트 로드
  useEffect(() => {
    if (!selectedSessionId) return;
    setIsLoadingReport(true);
    Promise.all([
      getSessionStudentReports(selectedSessionId),
      getSessionSummaryReport(selectedSessionId),
    ])
      .then(([students, summary]) => {
        setStudentReports(students as StudentReport[]);
        setSummaryReport(summary as SummaryReport);
      })
      .catch(() => { setStudentReports([]); setSummaryReport(null); })
      .finally(() => setIsLoadingReport(false));
  }, [selectedSessionId]);

  const keyQuestions: KeyQuestion[] = (summaryReport?.key_questions ?? []).map(parseQuestion);

  return (
    <div className={styles.page}>
      {/* 페이지 헤더 */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>AI 분석 리포트</h1>
        <button className={styles.exportBtn}>
          내보내기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          전체보기
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'students' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('students')}
        >
          학생 목록
        </button>
      </div>

      {/* 필터 드롭다운 */}
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={selectedClassId ?? ''}
          onChange={e => setSelectedClassId(Number(e.target.value))}
          disabled={isLoading}
        >
          {classes.length === 0 && <option value="">클래스 없음</option>}
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? ''} {cls.subject}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={selectedSessionId ?? ''}
          onChange={e => setSelectedSessionId(Number(e.target.value))}
          disabled={sessions.length === 0}
        >
          {sessions.length === 0 && <option value="">종료된 세션 없음</option>}
          {sessions.map(e => {
            const d = e.session.started_at ? new Date(e.session.started_at) : null;
            const label = d
              ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일${e.session.period ? ` ${e.session.period}교시` : ''}`
              : e.session.session_name;
            return <option key={e.session.id} value={e.session.id}>{label}</option>;
          })}
        </select>
      </div>

      {/* 컨텐츠 */}
      {isLoadingReport ? (
        <div className={styles.emptyState}>리포트 불러오는 중...</div>
      ) : !selectedSessionId ? (
        <div className={styles.emptyState}>세션을 선택해 리포트를 확인하세요.</div>
      ) : activeTab === 'summary' ? (
        <div className={styles.summaryLayout}>
          {/* AI 요약 */}
          {summaryReport?.overall_summary && (
            <div className={styles.aiSummaryCard}>
              <div className={styles.aiSummaryTitle}>
                <span className={styles.aiArrow}>→</span>
                AI 요약
              </div>
              <p className={styles.aiSummaryText}>{summaryReport.overall_summary}</p>
            </div>
          )}

          {/* 주요질문 + 취약개념 2열 */}
          {(keyQuestions.length > 0 || (summaryReport?.top_weak_concepts ?? []).length > 0) && (
            <div className={styles.twoCol}>
              {/* 주요 질문 */}
              <div className={styles.questionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>주요 질문</span>
                  {keyQuestions.length > 0 && (
                    <span className={styles.questionCount}>{keyQuestions.length}</span>
                  )}
                </div>
                <div className={styles.questionList}>
                  {keyQuestions.length === 0 ? (
                    <div className={styles.emptyInner}>질문 데이터가 없습니다.</div>
                  ) : keyQuestions.map((kq, i) => (
                    <div key={i} className={styles.questionRow}>
                      {kq.topic && (
                        <span className={styles.questionTopic}>{kq.topic}</span>
                      )}
                      <span className={styles.questionText}>{kq.question}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 취약개념 Top 5 */}
              <div className={styles.weakCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>취약개념 top5</span>
                </div>
                <div className={styles.weakList}>
                  {(summaryReport?.top_weak_concepts ?? []).length === 0 ? (
                    <div className={styles.emptyInner}>데이터가 없습니다.</div>
                  ) : (summaryReport?.top_weak_concepts ?? []).slice(0, 5).map((concept, i) => (
                    <div key={i} className={styles.weakItem}>
                      <span className={`${styles.weakRank} ${i < 3 ? styles.weakRankTop : ''}`}>
                        {i + 1}
                      </span>
                      <span className={styles.weakLabel}>{concept}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI 리포트 */}
          {summaryReport?.ai_report && (
            <div className={styles.aiReportCard}>
              <div className={styles.aiReportTitle}>AI 리포트</div>
              <p className={`${styles.aiReportText} ${aiReportExpanded ? styles.aiReportExpanded : styles.aiReportCollapsed}`}>
                {summaryReport.ai_report}
              </p>
              <button
                className={styles.viewMoreBtn}
                onClick={() => setAiReportExpanded(v => !v)}
              >
                {aiReportExpanded ? '접기' : '자세히 보기'}
              </button>
            </div>
          )}

          {!summaryReport && (
            <div className={styles.emptyState}>아직 리포트가 생성되지 않았습니다.</div>
          )}
        </div>
      ) : (
        /* 학생 목록 탭 */
        <div className={styles.studentList}>
          {studentReports.length === 0 ? (
            <div className={styles.emptyState}>학생 리포트가 없습니다.</div>
          ) : studentReports.map((report, i) => (
            <div key={i} className={styles.studentCard}>
              <div className={styles.studentCardHeader}>
                <div className={styles.studentAvatar} />
                <div>
                  <div className={styles.studentName}>{report.studentName}</div>
                  {report.summary && (
                    <div className={styles.studentSummary}>{report.summary}</div>
                  )}
                </div>
                {report.understanding_score !== undefined && (
                  <div className={styles.studentScore}>
                    <div className={styles.scoreValue}>{report.understanding_score}%</div>
                    <div className={styles.scoreLabel}>이해도</div>
                  </div>
                )}
              </div>
              {report.weak_concepts && report.weak_concepts.length > 0 && (
                <div className={styles.weakChips}>
                  {report.weak_concepts.map((c, j) => (
                    <span key={j} className={styles.weakChip}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
