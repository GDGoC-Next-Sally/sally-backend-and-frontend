'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  getSession,
  getAttendance,
  startSession,
  finishSession,
  type AttendanceStudent,
} from '@/actions/sessions';
import { SessionWidget } from '@/components/sessions/SessionWidget';
import { PageContainer } from '@/components/layout/PageContainer';

export default function SessionPage() {
  const params = useParams();
  const classId = params.id as string;
  const sessionId = params.sessionId as string;

  const [initialPhase, setInitialPhase] = useState<'waiting' | 'active' | null>(null);
  const [sessionName, setSessionName] = useState<string | undefined>();
  const [students, setStudents] = useState<AttendanceStudent[]>([]);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await getAttendance(sessionId);
      setStudents(data);
    } catch {
      // attendance may be empty
    }
  }, [sessionId]);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession(sessionId);
        setSessionName(session.session_name);
        setInitialPhase(session.status === 'ACTIVE' ? 'active' : 'waiting');
        await fetchStudents();
      } catch {
        setInitialPhase('waiting');
      }
    };
    init();
  }, [sessionId, fetchStudents]);

  const handleStart = async () => {
    await startSession(sessionId);
  };

  const handleFinish = async () => {
    await finishSession(sessionId);
  };

  if (initialPhase === null) {
    return <PageContainer><div>세션 정보를 불러오는 중...</div></PageContainer>;
  }

  return (
    <PageContainer>
      <SessionWidget
        classId={classId}
        sessionId={sessionId}
        initialPhase={initialPhase}
        sessionName={sessionName}
        students={students}
        onStart={handleStart}
        onFinish={handleFinish}
        onRefreshStudents={fetchStudents}
      />
    </PageContainer>
  );
}
