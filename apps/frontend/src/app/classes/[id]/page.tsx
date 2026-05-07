'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getClass, type ClassItem } from '@/actions/classes';
import {
  getSessionsByClass,
  createSession,
  updateSession,
  deleteSession,
  type Session,
  type CreateSessionBody,
} from '@/actions/sessions';
import { SessionGrid } from '@/components/sessions/SessionGrid';

export default function ClassDetailPage() {
  const params = useParams();
  const classId = Number(params.id);

  const [classInfo, setClassInfo] = useState<ClassItem | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [cls, ses] = await Promise.all([
        getClass(classId),
        getSessionsByClass(classId),
      ]);
      setClassInfo(cls);
      setSessions(ses);
    } catch {
      setSessions([]);
    }
  }, [classId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteSession = async (id: number) => {
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleCreateSession = async (body: CreateSessionBody) => {
    try {
      const newSession = await createSession(body);
      setSessions((prev) => [...prev, newSession]);
    } catch {
      alert('세션 생성에 실패했습니다.');
    }
  };

  const handleUpdateSession = async (sessionId: number, body: CreateSessionBody) => {
    try {
      const updated = await updateSession(sessionId, body);
      setSessions((prev) => prev.map((s) => s.id === sessionId ? updated : s));
    } catch {
      alert('세션 수정에 실패했습니다.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      padding: '24px',
      backgroundColor: 'var(--color-bg)',
      minHeight: 'calc(100vh - 60px)',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <SessionGrid
        classId={classId}
        classInfo={classInfo}
        sessions={sessions}
        onDeleteSession={handleDeleteSession}
        onCreateSession={handleCreateSession}
        onUpdateSession={handleUpdateSession}
        onRefresh={fetchData}
      />
    </div>
  );
}
