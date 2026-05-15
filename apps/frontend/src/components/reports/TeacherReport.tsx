'use client';

import React, { useState } from 'react';
import { Download, Search, ChevronLeft, BookOpen, Lightbulb, Smile, MessageSquare, FileSearch, RefreshCw } from 'lucide-react';
import styles from './TeacherReport.module.css';
import { ReportExportModal } from './ReportExportModal';
import { MarkdownReport } from './MarkdownReport';

/* ─────────────────────────────────────────── Types ── */

export interface ClassOption {
  id: number;
  label: string;
}

export interface SessionOption {
  id: number;
  label: string;
}

export interface KeyQuestion {
  topic?: string;
  question: string;
}

export interface SummaryReportData {
  overallSummary: string;
  keyQuestions: KeyQuestion[];
  topWeakConcepts: string[];
  aiReport: string;
}

export interface StudentReportRow {
  id: number;
  studentId: string;
  name: string;
  participation: number;
  comprehension: number;
  mainEmotion: string;
  interventionCount: number;
}

export type TimelineEventType = 'concept' | 'intervention';

export interface TimelineEvent {
  type: TimelineEventType;
  label: string;
  description: string;
  time: string;
  positionPercent: number;
}

export interface StudentDetailData {
  studentId: string;
  name: string;
  className: string;
  participation: number;
  comprehension: number;
  mainEmotion: string;
  interventionCount: number;
  learningTopic: string;
  totalDuration: string;
  timeline: TimelineEvent[];
  repeatedMisconceptions: string[];
  aiWeaknessCheck: string;
  aiStatusSummary: string;
  aiReport: string;
}

export interface TeacherReportProps {
  classes: ClassOption[];
  sessions: SessionOption[];
  selectedClassId: number | null;
  selectedSessionId: number | null;
  activeTab: 'summary' | 'students';
  isLoading: boolean;
  summaryReport: SummaryReportData | null;
  studentReports: StudentReportRow[];
  selectedStudent: StudentDetailData | null;
  studentSearch: string;
  onClassChange: (id: number) => void;
  onSessionChange: (id: number) => void;
  onTabChange: (tab: 'summary' | 'students') => void;
  onStudentSelect: (studentId: string) => void;
  onStudentBack: () => void;
  onSearchChange: (value: string) => void;
  onExport?: () => void;
  onRequestSummary?: () => Promise<void>;
}

/* ──────────────────────────────────── Helpers ── */

const EMOTION_STYLE: Record<string, { color: string; bg: string }> = {
  불안: { color: '#FF6F6F', bg: 'rgba(255, 111, 111, 0.1)' },
  안정: { color: '#22CB84', bg: '#E9F7F0' },
  집중: { color: '#22CB84', bg: '#E9F7F0' },
  무기력: { color: '#8A8F8C', bg: '#F5F6F8' },
  혼란: { color: '#FF6F6F', bg: 'rgba(255, 111, 111, 0.1)' },
};

function EmotionBadge({ emotion }: { emotion: string }) {
  const s = EMOTION_STYLE[emotion] ?? { color: '#8A8F8C', bg: '#F5F6F8' };
  return (
    <span
      className={styles.emotionBadge}
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {emotion}
    </span>
  );
}

/* ─────────────────────────────── Skeleton ── */

function SummarySkeleton() {
  return (
    <div className={styles.summaryLayout}>
      <div className={styles.card}>
        <div className={styles.skeletonLine} style={{ width: '100%', marginBottom: 8 }} />
        <div className={styles.skeletonLine} style={{ width: '80%' }} />
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          {[100, 90, 85].map((w, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width: `${w}%`, marginBottom: 8 }} />
          ))}
        </div>
        <div className={styles.card}>
          {[80, 65, 72].map((w, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width: `${w}%`, marginBottom: 8 }} />
          ))}
        </div>
      </div>
      <div className={styles.card}>
        {[100, 90, 60].map((w, i) => (
          <div key={i} className={styles.skeletonLine} style={{ width: `${w}%`, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────── Timeline ── */

function Timeline({ events, totalDuration }: { events: TimelineEvent[]; totalDuration: string }) {
  if (events.length === 0) {
    return <p className={styles.empty}>타임라인 데이터가 없습니다.</p>;
  }
  return (
    <div className={styles.timelineScrollWrap}>
      <div className={styles.timelineWrap}>
        <div className={styles.timelineTrack} />
        {events.map((ev, i) => (
          <div
            key={i}
            className={styles.timelinePoint}
            style={{ left: `${ev.positionPercent}%` }}
          >
            <div className={`${styles.tpCard} ${ev.type === 'concept' ? styles.tpCardAbove : styles.tpCardBelow}`}>
              <span className={styles.tpLabel}>{ev.label}</span>
              <span className={styles.tpDesc}>{ev.description}</span>
            </div>
            <div className={`${styles.tpDot} ${ev.type === 'concept' ? styles.tpDotConcept : styles.tpDotIntervention}`} />
            <span className={styles.tpTime}>{ev.time}</span>
          </div>
        ))}
      </div>
      {totalDuration && totalDuration !== '—' && (
        <p className={styles.timelineDuration}>총 소요시간 {totalDuration}</p>
      )}
    </div>
  );
}

/* ─────────────────────── Summary view (전체보기) ── */

function SummaryView({
  summaryReport,
  selectedSessionId,
}: {
  summaryReport: SummaryReportData | null;
  selectedSessionId: number | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!selectedSessionId) {
    return (
      <div className={styles.summaryLayout}>
        <div className={styles.card}>
          <div className={styles.aiSummaryTitle}>
            <span className={styles.aiStar}>✦</span>
            <span>AI 요약</span>
          </div>
          <p className={styles.empty}>세션을 선택하면 AI 요약이 표시됩니다.</p>
        </div>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>주요 질문</span>
            </div>
            <p className={styles.empty}>질문 데이터가 없습니다.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>취약개념 top5</span>
            </div>
            <p className={styles.empty}>데이터가 없습니다.</p>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>AI 리포트</span>
          </div>
          <p className={styles.empty}>세션을 선택하면 AI 리포트가 표시됩니다.</p>
        </div>
      </div>
    );
  }

  if (selectedSessionId && !summaryReport) {
    return (
      <div className={styles.reportGenerating}>
        <FileSearch size={120} strokeWidth={1} color="#22CB84" />
        <p className={styles.reportGenTitle}>리포트 생성 중...</p>
        <p className={styles.reportGenSub}>리포트가 생성 중입니다. 조금만 기다려주세요.</p>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.summaryLayout}>
      {/* AI 요약 */}
      <div className={styles.card}>
        <div className={styles.aiSummaryTitle}>
          <span className={styles.aiStar}>✦</span>
          <span>AI 요약</span>
        </div>
        {summaryReport?.overallSummary ? (
          <p className={styles.bodyText}>{summaryReport.overallSummary}</p>
        ) : (
          <p className={styles.empty}>아직 AI 요약이 생성되지 않았습니다.</p>
        )}
      </div>

      {/* 주요 질문 + 취약개념 */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>주요 질문</span>
            {(summaryReport?.keyQuestions.length ?? 0) > 0 && (
              <span className={styles.countBadge}>{summaryReport!.keyQuestions.length}</span>
            )}
          </div>
          <div className={styles.questionList}>
            {(summaryReport?.keyQuestions ?? []).length === 0 ? (
              <p className={styles.empty}>질문 데이터가 없습니다.</p>
            ) : (
              summaryReport!.keyQuestions.map((kq, i) => (
                <div key={i} className={styles.questionRow}>
                  {kq.topic && <span className={styles.questionTopic}>{kq.topic}</span>}
                  <span className={styles.questionText}>{kq.question}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>취약개념 top5</span>
          </div>
          <div className={styles.weakList}>
            {(summaryReport?.topWeakConcepts ?? []).length === 0 ? (
              <p className={styles.empty}>데이터가 없습니다.</p>
            ) : (
              summaryReport!.topWeakConcepts.slice(0, 5).map((concept, i) => (
                <div key={i} className={styles.weakItem}>
                  <span className={`${styles.weakRank} ${i < 3 ? styles.weakRankTop : ''}`}>
                    {i + 1}
                  </span>
                  <span className={styles.weakLabel}>{concept}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI 리포트 */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>AI 리포트</span>
        </div>
        {summaryReport?.aiReport ? (
          <>
            <MarkdownReport content={summaryReport.aiReport} clamped={!expanded} />
            <button className={styles.viewMoreBtn} onClick={() => setExpanded(v => !v)}>
              {expanded ? '접기' : '자세히 보기'}
            </button>
          </>
        ) : (
          <p className={styles.empty}>아직 리포트가 생성되지 않았습니다.</p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────── Student list view (학생 목록) ── */

function StudentListView({
  studentReports,
  studentSearch,
  onStudentSelect,
}: {
  studentReports: StudentReportRow[];
  studentSearch: string;
  onStudentSelect: (studentId: string) => void;
}) {
  const filtered = studentSearch
    ? studentReports.filter(r => r.name.includes(studentSearch))
    : studentReports;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>이름</th>
            <th>참여도</th>
            <th>이해도</th>
            <th>주요 감정상태</th>
            <th>개입 횟수</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.tableEmpty}>
                {studentReports.length === 0 ? '학생 리포트가 없습니다.' : '검색 결과가 없습니다.'}
              </td>
            </tr>
          ) : (
            filtered.map(sr => (
              <tr key={sr.id}>
                <td>
                  <div className={styles.studentCell}>
                    <div className={styles.avatar} />
                    <span className={styles.studentName}>{sr.name}</span>
                  </div>
                </td>
                <td className={styles.metricCell}>
                  {sr.participation > 0 ? `${sr.participation}%` : '—'}
                </td>
                <td className={styles.metricCell}>
                  {sr.comprehension > 0 ? `${sr.comprehension}%` : '—'}
                </td>
                <td>
                  {sr.mainEmotion && sr.mainEmotion !== '—' ? (
                    <EmotionBadge emotion={sr.mainEmotion} />
                  ) : (
                    <span className={styles.dash}>—</span>
                  )}
                </td>
                <td className={styles.metricCell}>{sr.interventionCount}회</td>
                <td>
                  <button
                    className={styles.detailBtn}
                    onClick={() => onStudentSelect(sr.studentId)}
                  >
                    개별 리포트 보기
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────── Student detail view (개별) ── */

function StudentDetailView({
  student,
  onBack,
}: {
  student: StudentDetailData;
  onBack: () => void;
}) {
  const [reportExpanded, setReportExpanded] = useState(false);

  return (
    <div className={styles.summaryLayout}>
      {/* 목록보기 */}
      <button className={styles.backBtn} onClick={onBack}>
        <ChevronLeft size={16} strokeWidth={2.5} />
        목록보기
      </button>

      {/* 학생 프로필 헤더 */}
      <div className={styles.card}>
        <div className={styles.detailHeader}>
          <div className={styles.detailProfile}>
            <div className={styles.detailAvatar} />
            <div>
              <div className={styles.detailName}>{student.name}</div>
              {student.className && (
                <div className={styles.detailClass}>{student.className}</div>
              )}
            </div>
          </div>
          <div className={styles.detailStats}>
            <div className={styles.detailStat}>
              <span className={styles.statLabel}>참여도</span>
              <div className={styles.statValueRow}>
                <BookOpen size={24} strokeWidth={1.5} color="#626664" />
                <span className={styles.statNum}>
                  {student.participation > 0 ? `${student.participation}%` : '—'}
                </span>
              </div>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.statLabel}>이해도</span>
              <div className={styles.statValueRow}>
                <Lightbulb size={24} strokeWidth={1.5} color="#626664" />
                <span className={styles.statNum}>
                  {student.comprehension > 0 ? `${student.comprehension}%` : '—'}
                </span>
              </div>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.statLabel}>주요 감정</span>
              <div className={styles.statValueRow}>
                <Smile size={24} strokeWidth={1.5} color="#626664" />
                <span className={styles.statNum}>
                  {student.mainEmotion && student.mainEmotion !== '—' ? student.mainEmotion : '—'}
                </span>
              </div>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.statLabel}>개입 횟수</span>
              <div className={styles.statValueRow}>
                <MessageSquare size={24} strokeWidth={1.5} color="#626664" />
                <span className={styles.statNum}>
                  {student.interventionCount > 0 ? `${student.interventionCount}회` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2열: 타임라인 섹션 + 반복오개념 */}
      <div className={styles.twoColDetail}>
        {/* 학습 주제 + 타임라인 + AI 상태요약 */}
        <div className={styles.card}>
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>학습 주제</span>
            </div>
            <p className={styles.learningTopicText}>{student.learningTopic || '—'}</p>
          </div>

          <div className={styles.timelineSectionHeader}>
            <span className={styles.sectionTitle}>주요 타임라인</span>
          </div>
          <Timeline events={student.timeline} totalDuration={student.totalDuration} />

          {student.aiStatusSummary && (
            <div className={styles.aiStatusBox}>
              <div className={styles.aiSummaryTitle}>
                <span className={styles.aiStar}>✦</span>
                <span>AI 상태요약</span>
              </div>
              <p className={styles.bodyText}>{student.aiStatusSummary}</p>
            </div>
          )}
        </div>

        {/* 반복오개념 + AI 약점체크 */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>반복오개념</span>
          </div>
          <div className={styles.weakList}>
            {student.repeatedMisconceptions.length === 0 ? (
              <p className={styles.empty}>오개념 없음</p>
            ) : (
              student.repeatedMisconceptions.slice(0, 5).map((m, i) => (
                <div key={i} className={styles.weakItem}>
                  <span className={`${styles.weakRank} ${i < 3 ? styles.weakRankTop : ''}`}>
                    {i + 1}
                  </span>
                  <span className={styles.weakLabel}>{m}</span>
                </div>
              ))
            )}
          </div>

          {student.aiWeaknessCheck && (
            <div className={styles.aiWeaknessBox}>
              <div className={styles.aiSummaryTitle}>
                <span className={styles.aiStar}>✦</span>
                <span>AI 약점체크</span>
              </div>
              <p className={styles.bodyText}>{student.aiWeaknessCheck}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI 리포트 */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>AI 리포트</span>
        </div>
        {student.aiReport ? (
          <>
            <MarkdownReport content={student.aiReport} clamped={!reportExpanded} />
            <button
              className={styles.viewMoreBtn}
              onClick={() => setReportExpanded(v => !v)}
            >
              {reportExpanded ? '접기' : '자세히 보기'}
            </button>
          </>
        ) : (
          <p className={styles.empty}>아직 리포트가 생성되지 않았습니다.</p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────── Main Component ── */

export function TeacherReport({
  classes,
  sessions,
  selectedClassId,
  selectedSessionId,
  activeTab,
  isLoading,
  summaryReport,
  studentReports,
  selectedStudent,
  studentSearch,
  onClassChange,
  onSessionChange,
  onTabChange,
  onStudentSelect,
  onStudentBack,
  onSearchChange,
  onExport,
  onRequestSummary,
}: TeacherReportProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  const handleRegenerateConfirm = async () => {
    if (!onRequestSummary) return;
    setIsRegenerating(true);
    try {
      await onRequestSummary();
      setRegenerateSuccess(true);
    } finally {
      setIsRegenerating(false);
      setIsRegenerateConfirmOpen(false);
    }
  };

  return (
    <div className={styles.whiteBg}>
    <div className={styles.page}>
      {isExportOpen && <ReportExportModal onClose={() => setIsExportOpen(false)} />}

      {/* 재생성 확인 모달 */}
      {isRegenerateConfirmOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRegenerateConfirmOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>리포트 재생성</h2>
            <p className={styles.modalDesc}>
              AI가 이 세션의 전체 요약 리포트를 다시 생성합니다.<br />
              완료까지 잠시 시간이 걸릴 수 있습니다.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setIsRegenerateConfirmOpen(false)}
              >
                취소
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleRegenerateConfirm}
                disabled={isRegenerating}
              >
                {isRegenerating ? '요청 중...' : '재생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>AI 분석 리포트</h1>
        <div className={styles.headerBtns}>
          {regenerateSuccess && (
            <span className={styles.regenerateSuccess}>재생성 요청 완료</span>
          )}
          <button
            className={styles.regenerateBtn}
            onClick={() => { setRegenerateSuccess(false); setIsRegenerateConfirmOpen(true); }}
            disabled={!selectedSessionId}
          >
            <RefreshCw size={15} strokeWidth={2} />
            재생성
          </button>
          <button className={styles.exportBtn} onClick={() => { onExport?.(); setIsExportOpen(true); }}>
            내보내기
            <Download size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 개별 학생 상세 뷰 */}
      {selectedStudent ? (
        <StudentDetailView student={selectedStudent} onBack={onStudentBack} />
      ) : (
        <>
          {/* 탭 */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`}
              onClick={() => onTabChange('summary')}
            >
              전체보기
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'students' ? styles.tabActive : ''}`}
              onClick={() => onTabChange('students')}
            >
              학생 목록
            </button>
          </div>

          {/* 필터 행 */}
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={selectedClassId ?? ''}
              onChange={e => onClassChange(Number(e.target.value))}
              disabled={classes.length === 0}
            >
              {classes.length === 0 && <option value="">클래스 없음</option>}
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.label}</option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={selectedSessionId ?? ''}
              onChange={e => onSessionChange(Number(e.target.value))}
              disabled={sessions.length === 0}
            >
              {sessions.length === 0 && <option value="">종료된 세션 없음</option>}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            {activeTab === 'students' && (
              <div className={styles.searchBox}>
                <Search size={16} color="#9CA3AF" strokeWidth={2} />
                <input
                  className={styles.searchInput}
                  placeholder="학생 검색"
                  value={studentSearch}
                  onChange={e => onSearchChange(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 컨텐츠 */}
          {isLoading ? (
            <SummarySkeleton />
          ) : activeTab === 'summary' ? (
            <SummaryView
              summaryReport={summaryReport}
              selectedSessionId={selectedSessionId}
            />
          ) : (
            <StudentListView
              studentReports={studentReports}
              studentSearch={studentSearch}
              onStudentSelect={onStudentSelect}
            />
          )}
        </>
      )}
    </div>
    </div>
  );
}
