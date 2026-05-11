'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTeacherClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { getSessionStudentReports, getSessionSummaryReport } from '@/actions/reports';

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

interface SummaryReport {
  average_understanding?: number;
  top_weak_concepts?: string[];
  key_questions?: string[];
  overall_summary?: string;
  total_students?: number;
}

export default function TeacherReportsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'students'>('summary');

  useEffect(() => {
    const load = async () => {
      try {
        const classes = await getTeacherClasses();
        const results = await Promise.allSettled(
          classes.map(cls => getSessionsByClass(cls.id).then(ss => ss.map(s => ({ session: s, cls }))))
        );
        const all: SessionEntry[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...r.value);
        }
        // Sort by most recent first
        all.sort((a, b) => {
          const da = a.session.started_at ?? a.session.scheduled_date ?? '';
          const db = b.session.started_at ?? b.session.scheduled_date ?? '';
          return db.localeCompare(da);
        });
        // Only finished sessions have reports
        const finished = all.filter(e => e.session.finished_at);
        setSessions(finished);
        if (finished.length > 0) {
          setSelectedSessionId(finished[0].session.id);
        }
      } catch {
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

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
      .catch(() => {
        setStudentReports([]);
        setSummaryReport(null);
      })
      .finally(() => setIsLoadingReport(false));
  }, [selectedSessionId]);

  const selectedEntry = sessions.find(e => e.session.id === selectedSessionId);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B6B', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ‹ 뒤로
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A', margin: '8px 0 4px' }}>AI 분석 리포트</h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', margin: 0 }}>종료된 세션의 AI 분석 결과를 확인합니다.</p>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Session list sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B6B6B', marginBottom: 12 }}>세션 목록</div>
            {isLoading ? (
              <div style={{ fontSize: 13, color: '#ABABAB', textAlign: 'center', padding: '20px 0' }}>불러오는 중...</div>
            ) : sessions.length === 0 ? (
              <div style={{ fontSize: 13, color: '#ABABAB', textAlign: 'center', padding: '20px 0' }}>종료된 세션이 없습니다.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(entry => {
                  const isSelected = entry.session.id === selectedSessionId;
                  const date = entry.session.finished_at ? new Date(entry.session.finished_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
                  const label = `${entry.cls.grade ? `${entry.cls.grade}학년 ` : ''}${entry.cls.subject}`;
                  return (
                    <li
                      key={entry.session.id}
                      onClick={() => setSelectedSessionId(entry.session.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: isSelected ? '#ECFDF5' : 'transparent',
                        border: `1.5px solid ${isSelected ? '#22CB84' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{entry.session.session_name}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 2 }}>{label} · {date}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Report content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedSessionId ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#ABABAB', fontSize: 14 }}>
              세션을 선택해 리포트를 확인하세요.
            </div>
          ) : isLoadingReport ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#ABABAB', fontSize: 14 }}>
              리포트 불러오는 중...
            </div>
          ) : (
            <>
              {/* Session header */}
              {selectedEntry && (
                <div style={{ background: 'white', borderRadius: 12, padding: '16px 24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>{selectedEntry.session.session_name}</div>
                    <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 2 }}>
                      {selectedEntry.cls.grade ? `${selectedEntry.cls.grade}학년 ` : ''}{selectedEntry.cls.subject}
                      {selectedEntry.session.finished_at && ` · ${new Date(selectedEntry.session.finished_at).toLocaleDateString('ko-KR')}`}
                    </div>
                  </div>
                  {summaryReport?.total_students !== undefined && (
                    <div style={{ background: '#ECFDF5', color: '#22CB84', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
                      참여 학생 {summaryReport.total_students}명
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'white', borderRadius: 10, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: 'fit-content' }}>
                {(['summary', 'students'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      background: activeTab === tab ? '#22CB84' : 'transparent',
                      color: activeTab === tab ? 'white' : '#6B6B6B',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab === 'summary' ? '전체 요약' : '학생별 리포트'}
                  </button>
                ))}
              </div>

              {activeTab === 'summary' && summaryReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {summaryReport.overall_summary && (
                    <ReportCard title="AI 종합 요약">
                      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{summaryReport.overall_summary}</p>
                    </ReportCard>
                  )}

                  {summaryReport.average_understanding !== undefined && (
                    <ReportCard title="평균 이해도">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 40, fontWeight: 800, color: '#22CB84' }}>{summaryReport.average_understanding}%</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${summaryReport.average_understanding}%`, background: '#22CB84', borderRadius: 5 }} />
                          </div>
                        </div>
                      </div>
                    </ReportCard>
                  )}

                  {summaryReport.top_weak_concepts && summaryReport.top_weak_concepts.length > 0 && (
                    <ReportCard title="취약 개념 Top 5">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {summaryReport.top_weak_concepts.slice(0, 5).map((concept, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#FEF3C7', color: '#B45309', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ fontSize: 14, color: '#374151' }}>{concept}</span>
                          </li>
                        ))}
                      </ul>
                    </ReportCard>
                  )}

                  {summaryReport.key_questions && summaryReport.key_questions.length > 0 && (
                    <ReportCard title="주요 질문">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summaryReport.key_questions.map((q, i) => (
                          <li key={i} style={{ fontSize: 14, color: '#374151', paddingLeft: 16, borderLeft: '3px solid #22CB84', lineHeight: 1.6 }}>{q}</li>
                        ))}
                      </ul>
                    </ReportCard>
                  )}
                </div>
              )}

              {activeTab === 'students' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {studentReports.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#ABABAB', fontSize: 14 }}>
                      학생 리포트가 없습니다.
                    </div>
                  ) : studentReports.map((report, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A' }}>{report.studentName}</div>
                        {report.understanding_score !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#6B6B6B' }}>이해도</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#22CB84' }}>{report.understanding_score}%</span>
                          </div>
                        )}
                      </div>
                      {report.summary && <p style={{ fontSize: 13, color: '#6B6B6B', margin: '0 0 10px', lineHeight: 1.6 }}>{report.summary}</p>}
                      {report.weak_concepts && report.weak_concepts.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {report.weak_concepts.map((c, j) => (
                            <span key={j} style={{ background: '#FEF3C7', color: '#B45309', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'summary' && !summaryReport && (
                <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#ABABAB', fontSize: 14 }}>
                  아직 리포트가 생성되지 않았습니다.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>{title}</div>
      {children}
    </div>
  );
}
