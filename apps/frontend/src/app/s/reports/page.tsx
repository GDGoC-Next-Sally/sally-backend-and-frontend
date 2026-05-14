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
  const [dialogId, setDialogId] = useState<number | null>(null);
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
    setDialogId(null);

    const fetchReport = () =>
      getStudentSessionReport(selectedSessionId)
        .then(r => {
          const raw = r as { content?: StudentReportContent; dialog_id?: number } | null;
          const content = raw?.content ?? null;
          setReport(content);
          if (raw?.dialog_id) setDialogId(raw.dialog_id);
          return content;
        })
        .catch(() => { setReport(null); return null; });

    let intervalId: ReturnType<typeof setInterval>;

    fetchReport().then(content => {
      setIsLoadingReport(false);
      if (!content) {
        intervalId = setInterval(() => {
          fetchReport().then(c => { if (c) clearInterval(intervalId); });
        }, 5000);
      }
    });

    return () => clearInterval(intervalId);
  }, [selectedSessionId]);

  return (
    <PageContainer>
      <StudentReport
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        report={report}
        dialogId={dialogId}
        isLoading={isLoading || isLoadingReport}
        studentName={user?.name ?? ''}
        onSessionChange={setSelectedSessionId}
      />
    </PageContainer>
  );
}
