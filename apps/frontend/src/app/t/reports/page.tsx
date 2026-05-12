'use client';

import { useState, useEffect } from 'react';
import { getTeacherClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { getSessionStudentReports, getSessionSummaryReport } from '@/actions/reports';
import styles from './reports.module.css';

/* ── 타입 정의 ─────────────────────────────────────────────── */

interface SessionEntry {
  session: Session;
  cls: ClassItem;
}

// 실제 백엔드 student_reports 레코드 구조
interface RawStudentReport {
  id: number;
  session_id: number;
  student_id: string;
  report: {
    key_concepts?: { main_concepts?: string[]; weak_concepts?: string[] };
    misconception_summary?: string[];
    session_summary?: string;
    detailed_report?: string;
  } | null;
  created_at: string;
  users?: { id: string; name: string; email: string };
}

interface KeyQuestion {
  topic?: string;
  question: string;
}

interface SummaryReport {
  top_weak_concepts?: string[];
  key_questions?: string[] | KeyQuestion[];
  overall_summary?: string;
  ai_report?: string;
}

function parseQuestion(raw: string | KeyQuestion): KeyQuestion {
  if (typeof raw === 'object') return raw;
  const colonIdx = raw.indexOf(':');
  if (colonIdx > 0 && colonIdx < 20) {
    return { topic: raw.slice(0, colonIdx).trim(), question: raw.slice(colonIdx + 1).trim() };
  }
  return { question: raw };
}

/* ── 스켈레톤 레이아웃 공통 컴포넌트 ──────────────────────── */
function SummarySkeleton() {
  return (
    <div className={styles.summaryLayout}>
      <div className={styles.aiSummaryCard}>
        <div className={styles.aiSummaryTitle}><span className={styles.aiArrow}>→</span>AI 요약</div>
        <div className={styles.skeletonLine} style={{ width: '100%', marginBottom: 8 }} />
        <div className={styles.skeletonLine} style={{ width: '80%' }} />
      </div>
      <div className={styles.twoCol}>
        <div className={styles.questionCard}>
          <div className={styles.sectionHeader}><span className={styles.sectionTitle}>주요 질문</span></div>
          <div className={styles.skeletonLine} style={{ width: '90%', marginBottom: 8 }} />
          <div className={styles.skeletonLine} style={{ width: '75%', marginBottom: 8 }} />
          <div className={styles.skeletonLine} style={{ width: '85%' }} />
        </div>
        <div className={styles.weakCard}>
          <div className={styles.sectionHeader}><span className={styles.sectionTitle}>취약개념 top5</span></div>
          <div className={styles.skeletonLine} style={{ width: '80%', marginBottom: 8 }} />
          <div className={styles.skeletonLine} style={{ width: '65%', marginBottom: 8 }} />
          <div className={styles.skeletonLine} style={{ width: '72%' }} />
        </div>
      </div>
      <div className={styles.aiReportCard}>
        <div className={styles.aiReportTitle}>AI 리포트</div>
        <div className={styles.skeletonLine} style={{ width: '100%', marginBottom: 8 }} />
        <div className={styles.skeletonLine} style={{ width: '90%', marginBottom: 8 }} />
        <div className={styles.skeletonLine} style={{ width: '60%' }} />
      </div>
    </div>
  );
}

/* ── 개별 학생 상세 리포트 뷰 ──────────────────────────────── */
function StudentDetailView({
  report,
  sessionInfo,
  onBack,
}: {
  report: RawStudentReport;
  sessionInfo: SessionEntry | null;
  onBack: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const r = report.report;
  const studentName = report.users?.name ?? '학생';
  const weakConcepts = r?.key_concepts?.weak_concepts?.filter(c => c !== '없음') ?? [];
  const misconceptions = r?.misconception_summary?.filter(c => c !== '없음') ?? [];
  const mainConcepts = r?.key_concepts?.main_concepts?.filter(c => c !== '없음') ?? [];
  const classLabel = sessionInfo
    ? `${sessionInfo.cls.grade ? sessionInfo.cls.grade + '학년 ' : ''}${sessionInfo.cls.homeroom ?? ''} ${sessionInfo.cls.subject}`
    : '';

  return (
    <div className={styles.summaryLayout}>
      {/* 목록보기 버튼 */}
      <button className={styles.backBtn} onClick={onBack}>
        ← 목록보기
      </button>

      {/* 학생 프로필 헤더 카드 */}
      <div className={styles.studentDetailHeader}>
        <div className={styles.studentDetailProfile}>
          <div className={styles.studentDetailAvatar} />
          <div>
            <div className={styles.studentDetailName}>{studentName}</div>
            {classLabel && <div className={styles.studentDetailClass}>{classLabel}</div>}
          </div>
        </div>
        <div className={styles.studentDetailStats}>
          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>학습 주제</div>
            <div className={styles.detailStatValue} style={{ fontSize: 14, color: '#374151' }}>
              {mainConcepts.length > 0 ? mainConcepts[0] : '—'}
            </div>
          </div>
          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>취약 개념 수</div>
            <div className={styles.detailStatValue}>{weakConcepts.length}개</div>
          </div>
          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>반복 오개념</div>
            <div className={styles.detailStatValue}>{misconceptions.length}건</div>
          </div>
        </div>
      </div>

      {/* 2열: 학습 주제 + 반복오개념 */}
      <div className={styles.twoCol}>
        {/* 학습 주제 / 취약개념 */}
        <div className={styles.questionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>학습 주제 & 취약개념</span>
          </div>
          {mainConcepts.length === 0 && weakConcepts.length === 0 ? (
            <div className={styles.emptyInner}>아직 데이터가 없습니다.</div>
          ) : (
            <div className={styles.questionList}>
              {mainConcepts.map((c, i) => (
                <div key={i} className={styles.questionRow}>
                  <span className={styles.questionTopic}>주요</span>
                  <span className={styles.questionText}>{c}</span>
                </div>
              ))}
              {weakConcepts.map((c, i) => (
                <div key={i} className={styles.questionRow}>
                  <span className={styles.questionTopicWeak}>취약</span>
                  <span className={styles.questionText}>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 반복오개념 */}
        <div className={styles.weakCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>반복오개념</span>
          </div>
          <div className={styles.weakList}>
            {misconceptions.length === 0 ? (
              <div className={styles.emptyInner}>오개념 없음</div>
            ) : misconceptions.slice(0, 5).map((m, i) => (
              <div key={i} className={styles.weakItem}>
                <span className={`${styles.weakRank} ${i < 3 ? styles.weakRankTop : ''}`}>{i + 1}</span>
                <span className={styles.weakLabel}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI 상태요약 */}
      <div className={styles.aiSummaryCard}>
        <div className={styles.aiSummaryTitle}>
          <span className={styles.aiArrow}>→</span>
          AI 상태요약
        </div>
        {r?.session_summary ? (
          <p className={styles.aiSummaryText}>{r.session_summary}</p>
        ) : (
          <p className={styles.emptyInner}>아직 AI 요약이 생성되지 않았습니다.</p>
        )}
      </div>

      {/* AI 리포트 */}
      <div className={styles.aiReportCard}>
        <div className={styles.aiReportTitle}>AI 리포트</div>
        {r?.detailed_report ? (
          <>
            <p className={`${styles.aiReportText} ${expanded ? styles.aiReportExpanded : styles.aiReportCollapsed}`}>
              {r.detailed_report}
            </p>
            <button className={styles.viewMoreBtn} onClick={() => setExpanded(v => !v)}>
              {expanded ? '접기' : '자세히 보기'}
            </button>
          </>
        ) : (
          <p className={styles.emptyInner}>아직 리포트가 생성되지 않았습니다.</p>
        )}
      </div>
    </div>
  );
}

/* ── 메인 페이지 컴포넌트 ──────────────────────────────────── */
export default function TeacherReportsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [studentReports, setStudentReports] = useState<RawStudentReport[]>([]);
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'students'>('summary');
  const [aiReportExpanded, setAiReportExpanded] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<RawStudentReport | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    getTeacherClasses()
      .then(cls => { setClasses(cls); if (cls.length > 0) setSelectedClassId(cls[0].id); })
      .catch(() => setClasses([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    setSelectedSessionId(null);
    setSummaryReport(null);
    setStudentReports([]);
    setSelectedStudent(null);
    getSessionsByClass(selectedClassId)
      .then(ss => {
        const finished = ss.filter(s => s.finished_at).sort((a, b) => (b.finished_at ?? '').localeCompare(a.finished_at ?? ''));
        const cls = classes.find(c => c.id === selectedClassId)!;
        const entries = finished.map(s => ({ session: s, cls }));
        setSessions(entries);
        if (entries.length > 0) setSelectedSessionId(entries[0].session.id);
      })
      .catch(() => setSessions([]));
  }, [selectedClassId, classes]);

  useEffect(() => {
    if (!selectedSessionId) return;
    setIsLoadingReport(true);
    setSelectedStudent(null);
    Promise.all([
      getSessionStudentReports(selectedSessionId),
      getSessionSummaryReport(selectedSessionId),
    ])
      .then(([students, summary]) => {
        setStudentReports(students as RawStudentReport[]);
        setSummaryReport(summary as SummaryReport);
      })
      .catch(() => { setStudentReports([]); setSummaryReport(null); })
      .finally(() => setIsLoadingReport(false));
  }, [selectedSessionId]);

  const keyQuestions: KeyQuestion[] = (summaryReport?.key_questions ?? []).map(parseQuestion);
  const currentSession = sessions.find(e => e.session.id === selectedSessionId) ?? null;

  const filteredStudents = studentSearch
    ? studentReports.filter(r => (r.users?.name ?? '').includes(studentSearch))
    : studentReports;

  /* 개별 학생 뷰 */
  if (selectedStudent) {
    return (
      <div className={styles.page}>
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
        <StudentDetailView
          report={selectedStudent}
          sessionInfo={currentSession}
          onBack={() => setSelectedStudent(null)}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 헤더 */}
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
        <button className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`} onClick={() => setActiveTab('summary')}>전체보기</button>
        <button className={`${styles.tab} ${activeTab === 'students' ? styles.tabActive : ''}`} onClick={() => setActiveTab('students')}>학생 목록</button>
      </div>

      {/* 필터 */}
      <div className={styles.filterRow}>
        <select className={styles.filterSelect} value={selectedClassId ?? ''} onChange={e => setSelectedClassId(Number(e.target.value))} disabled={isLoading}>
          {classes.length === 0 && <option value="">클래스 없음</option>}
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.grade ? `${cls.grade}학년 ` : ''}{cls.homeroom ?? ''} {cls.subject}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={selectedSessionId ?? ''} onChange={e => setSelectedSessionId(Number(e.target.value))} disabled={sessions.length === 0}>
          {sessions.length === 0 && <option value="">종료된 세션 없음</option>}
          {sessions.map(e => {
            const d = e.session.started_at ? new Date(e.session.started_at) : null;
            const label = d ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일${e.session.period ? ` ${e.session.period}교시` : ''}` : e.session.session_name;
            return <option key={e.session.id} value={e.session.id}>{label}</option>;
          })}
        </select>
        {activeTab === 'students' && (
          <div className={styles.searchBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className={styles.searchInput} placeholder="학생 검색" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
          </div>
        )}
      </div>

      {/* 컨텐츠 */}
      {isLoadingReport ? (
        <SummarySkeleton />
      ) : !selectedSessionId ? (
        <div className={styles.summaryLayout}>
          <div className={styles.aiSummaryCard}>
            <div className={styles.aiSummaryTitle}><span className={styles.aiArrow}>→</span>AI 요약</div>
            <p className={styles.emptyInner}>세션을 선택하면 AI 요약이 표시됩니다.</p>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.questionCard}>
              <div className={styles.sectionHeader}><span className={styles.sectionTitle}>주요 질문</span></div>
              <div className={styles.emptyInner}>질문 데이터가 없습니다.</div>
            </div>
            <div className={styles.weakCard}>
              <div className={styles.sectionHeader}><span className={styles.sectionTitle}>취약개념 top5</span></div>
              <div className={styles.emptyInner}>데이터가 없습니다.</div>
            </div>
          </div>
          <div className={styles.aiReportCard}>
            <div className={styles.aiReportTitle}>AI 리포트</div>
            <p className={styles.emptyInner}>세션을 선택하면 AI 리포트가 표시됩니다.</p>
          </div>
        </div>
      ) : activeTab === 'summary' ? (
        /* ── 전체보기 탭 ── */
        <div className={styles.summaryLayout}>
          <div className={styles.aiSummaryCard}>
            <div className={styles.aiSummaryTitle}><span className={styles.aiArrow}>→</span>AI 요약</div>
            {summaryReport?.overall_summary
              ? <p className={styles.aiSummaryText}>{summaryReport.overall_summary}</p>
              : <p className={styles.emptyInner}>아직 AI 요약이 생성되지 않았습니다.</p>}
          </div>
          <div className={styles.twoCol}>
            <div className={styles.questionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>주요 질문</span>
                {keyQuestions.length > 0 && <span className={styles.questionCount}>{keyQuestions.length}</span>}
              </div>
              <div className={styles.questionList}>
                {keyQuestions.length === 0
                  ? <div className={styles.emptyInner}>질문 데이터가 없습니다.</div>
                  : keyQuestions.map((kq, i) => (
                    <div key={i} className={styles.questionRow}>
                      {kq.topic && <span className={styles.questionTopic}>{kq.topic}</span>}
                      <span className={styles.questionText}>{kq.question}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className={styles.weakCard}>
              <div className={styles.sectionHeader}><span className={styles.sectionTitle}>취약개념 top5</span></div>
              <div className={styles.weakList}>
                {(summaryReport?.top_weak_concepts ?? []).length === 0
                  ? <div className={styles.emptyInner}>데이터가 없습니다.</div>
                  : (summaryReport?.top_weak_concepts ?? []).slice(0, 5).map((concept, i) => (
                    <div key={i} className={styles.weakItem}>
                      <span className={`${styles.weakRank} ${i < 3 ? styles.weakRankTop : ''}`}>{i + 1}</span>
                      <span className={styles.weakLabel}>{concept}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className={styles.aiReportCard}>
            <div className={styles.aiReportTitle}>AI 리포트</div>
            {summaryReport?.ai_report ? (
              <>
                <p className={`${styles.aiReportText} ${aiReportExpanded ? styles.aiReportExpanded : styles.aiReportCollapsed}`}>{summaryReport.ai_report}</p>
                <button className={styles.viewMoreBtn} onClick={() => setAiReportExpanded(v => !v)}>{aiReportExpanded ? '접기' : '자세히 보기'}</button>
              </>
            ) : (
              <p className={styles.emptyInner}>아직 리포트가 생성되지 않았습니다.</p>
            )}
          </div>
        </div>
      ) : (
        /* ── 학생 목록 탭 ── */
        <div className={styles.studentTableWrap}>
          <table className={styles.studentTable}>
            <thead>
              <tr>
                <th>이름</th>
                <th>주요 학습 개념</th>
                <th>취약 개념 수</th>
                <th>반복 오개념</th>
                <th>AI 요약</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.tableEmpty}>
                    {studentReports.length === 0 ? '학생 리포트가 없습니다.' : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              ) : filteredStudents.map((sr, i) => {
                const r = sr.report;
                const name = sr.users?.name ?? '학생';
                const mainConcepts = r?.key_concepts?.main_concepts?.filter(c => c !== '없음') ?? [];
                const weakConcepts = r?.key_concepts?.weak_concepts?.filter(c => c !== '없음') ?? [];
                const misconceptions = r?.misconception_summary?.filter(c => c !== '없음') ?? [];
                return (
                  <tr key={sr.id ?? i} className={i === 0 ? styles.tableRowFirst : ''}>
                    <td>
                      <div className={styles.tableStudentCell}>
                        <div className={styles.tableAvatar} />
                        <span className={styles.tableStudentName}>{name}</span>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      {mainConcepts.length > 0 ? mainConcepts[0] : <span className={styles.tableDash}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {weakConcepts.length > 0
                        ? <span className={styles.tableCount}>{weakConcepts.length}개</span>
                        : <span className={styles.tableDash}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {misconceptions.length > 0
                        ? <span className={styles.tableBadgeWarn}>{misconceptions.length}건</span>
                        : <span className={styles.tableBadgeOk}>없음</span>}
                    </td>
                    <td className={styles.tableSummaryCell}>
                      {r?.session_summary
                        ? <span className={styles.tableSummaryText}>{r.session_summary}</span>
                        : <span className={styles.tableDash}>—</span>}
                    </td>
                    <td>
                      <button
                        className={`${styles.detailBtn} ${i === 0 ? styles.detailBtnActive : ''}`}
                        onClick={() => setSelectedStudent(sr)}
                      >
                        개별 리포트 보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
