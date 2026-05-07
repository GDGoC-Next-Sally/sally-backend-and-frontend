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

export default function SessionPage() {
  const params = useParams();
  const classId = params.id as string;
  const sessionId = params.sessionId as string;

  const [initialPhase, setInitialPhase] = useState<'waiting' | 'active' | null>(null);
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
    return <div style={{ padding: '2rem' }}>세션 정보를 불러오는 중...</div>;
  }

  return (
    <SessionWidget
      classId={classId}
      sessionId={sessionId}
      initialPhase={initialPhase}
      students={students}
      onStart={handleStart}
      onFinish={handleFinish}
      onRefreshStudents={fetchStudents}
    />
  );
}
