'use client';

import { useState, useEffect } from 'react';
import { getStudentSessionList, getStudentSessionReport, type SessionListItem } from '@/actions/reports';
import { PageContainer } from '@/components/layout/PageContainer';
import { StudentReport, type StudentReportContent } from '@/components/reports/StudentReport';
import { useUser } from '@/utils/useUser';

export default function StudentReportsPage() {
  const user = useUser();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [report, setReport] = useState<StudentReportContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    getStudentSessionList()
      .then(list => {
        setSessions(list);
        if (list.length > 0) setSelectedSessionId(list[0].sessionId);
      })
      .catch(() => setSessions([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    setIsLoadingReport(true);
    setReport(null);
    getStudentSessionReport(selectedSessionId)
      .then(r => {
        const raw = r as { content?: StudentReportContent } | null;
        setReport(raw?.content ?? null);
      })
      .catch(() => setReport(null))
      .finally(() => setIsLoadingReport(false));
  }, [selectedSessionId]);

  return (
    <PageContainer>
      <StudentReport
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        report={report}
        isLoading={isLoading || isLoadingReport}
        studentName={user?.name ?? ''}
        onSessionChange={setSelectedSessionId}
      />
    </PageContainer>
  );
}
