'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getClass } from '@/actions/classes';
import { getSessionsByClass, joinSession, type Session } from '@/actions/sessions';
import { StudentSessionList } from '@/components/students/StudentSessionList';

interface ClassInfo {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
}

export default function StudentClassDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = params.classId as string;
  const tab = searchParams.get('tab') ?? undefined;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchData = useCallback(async () => {
    const [cls, sessionList] = await Promise.allSettled([
      getClass(classId),
      getSessionsByClass(classId),
    ]);
    if (cls.status === 'fulfilled') setClassInfo(cls.value);
    if (sessionList.status === 'fulfilled') setSessions(sessionList.value);
  }, [classId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoinSession = async (sessionId: number) => {
    await joinSession(String(sessionId));
    router.push(`/s/classes/${classId}/sessions/${sessionId}`);
  };

  return (
    <StudentSessionList
      classId={classId}
      classInfo={classInfo}
      sessions={sessions}
      onJoinSession={handleJoinSession}
      initialTab={tab}
    />
  );
}
