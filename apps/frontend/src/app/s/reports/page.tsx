'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStudentSessionList, getStudentSessionReport, type SessionListItem } from '@/actions/reports';

interface MyReport {
  understanding_score?: number;
  weak_concepts?: string[];
  key_questions?: string[];
  summary?: string;
  engagement_level?: string;
  feedback?: string;
}

export default function StudentReportsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [report, setReport] = useState<MyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    getStudentSessionList()
      .then(list => {
        const finished = list.filter(s => s.finishedAt);
        setSessions(finished);
        if (finished.length > 0) setSelectedSessionId(finished[0].sessionId);
      })
      .catch(() => setSessions([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    setIsLoadingReport(true);
    getStudentSessionReport(selectedSessionId)
      .then(r => setReport(r as MyReport))
      .catch(() => setReport(null))
      .finally(() => setIsLoadingReport(false));
  }, [selectedSessionId]);

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B6B', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ‹ 뒤로
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A', margin: '8px 0 4px' }}>나의 학습 리포트</h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', margin: 0 }}>AI가 분석한 나의 학습 결과를 확인합니다.</p>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Session list */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B6B6B', marginBottom: 12 }}>세션 목록</div>
            {isLoading ? (
              <div style={{ fontSize: 13, color: '#ABABAB', textAlign: 'center', padding: '20px 0' }}>불러오는 중...</div>
            ) : sessions.length === 0 ? (
              <div style={{ fontSize: 13, color: '#ABABAB', textAlign: 'center', padding: '20px 0' }}>종료된 세션이 없습니다.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(session => {
                  const isSelected = session.sessionId === selectedSessionId;
                  const date = session.finishedAt ? new Date(session.finishedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
                  return (
                    <li
                      key={session.sessionId}
                      onClick={() => setSelectedSessionId(session.sessionId)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: isSelected ? '#ECFDF5' : 'transparent',
                        border: `1.5px solid ${isSelected ? '#22CB84' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{session.sessionName}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 2 }}>{session.subject} · {session.teacherName} · {date}</div>
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
          ) : !report ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#ABABAB', fontSize: 14 }}>
              아직 리포트가 생성되지 않았습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedSession && (
                <div style={{ background: 'white', borderRadius: 12, padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>{selectedSession.sessionName}</div>
                  <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 2 }}>{selectedSession.subject} · {selectedSession.teacherName} 선생님</div>
                </div>
              )}

              {report.understanding_score !== undefined && (
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>나의 이해도</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: '#22CB84' }}>{report.understanding_score}%</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${report.understanding_score}%`, background: '#22CB84', borderRadius: 6 }} />
                      </div>
                      {report.engagement_level && (
                        <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 6 }}>참여도: {report.engagement_level}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {report.summary && (
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>AI 학습 요약</div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{report.summary}</p>
                </div>
              )}

              {report.feedback && (
                <div style={{ background: '#ECFDF5', borderRadius: 12, padding: 20, border: '1.5px solid #D1FAE5' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>AI 피드백</div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{report.feedback}</p>
                </div>
              )}

              {report.weak_concepts && report.weak_concepts.length > 0 && (
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>내가 막힌 개념</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {report.weak_concepts.map((c, i) => (
                      <span key={i} style={{ background: '#FEF3C7', color: '#B45309', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {report.key_questions && report.key_questions.length > 0 && (
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>내가 한 주요 질문</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {report.key_questions.map((q, i) => (
                      <li key={i} style={{ fontSize: 14, color: '#374151', paddingLeft: 16, borderLeft: '3px solid #22CB84', lineHeight: 1.6 }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
