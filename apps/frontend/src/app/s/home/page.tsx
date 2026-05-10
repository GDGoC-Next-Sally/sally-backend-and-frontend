'use client';

import { useState, useEffect, useRef } from 'react';
import { getStudentClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { useUser } from '@/utils/useUser';
import { StudentDashboard } from '@/components/students/StudentDashboard';
import { computeSessionStatus } from '@/utils/sessionStatus';

interface ActiveSessionInfo {
  id: number;
  classId: number;
  subject: string;
  period?: number | null;
}

export interface RecentSessionInfo {
  id: number;
  classId: number;
  subject: string;
  sessionName: string;
  period?: number | null;
  status: 'ACTIVE' | 'FINISHED' | 'PLANNING';
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

type Entry = { cls: ClassItem; session: Session };

function buildDashboardData(entries: Entry[]) {
  let foundActive: ActiveSessionInfo | null = null;
  const visited: RecentSessionInfo[] = [];

  for (const { cls, session: s } of entries) {
    const computed = computeSessionStatus(s);
    if (computed === 'live' && !foundActive) {
      foundActive = { id: s.id, classId: cls.id, subject: cls.subject, period: s.period };
    }
    visited.push({
      id: s.id,
      classId: cls.id,
      subject: cls.subject,
      sessionName: s.session_name,
      period: s.period,
      status: s.status,
      scheduled_date: s.scheduled_date,
      scheduled_start: s.scheduled_start,
      scheduled_end: s.scheduled_end,
    });
  }

  // live 우선, 그 다음 scheduled_date 최신순
  visited.sort((a, b) => {
    const ca = computeSessionStatus(a);
    const cb = computeSessionStatus(b);
    if (ca === 'live' && cb !== 'live') return -1;
    if (cb === 'live' && ca !== 'live') return 1;
    return b.id - a.id;
  });

  return { foundActive, recent: visited.slice(0, 3) };
}

export default function StudentHomePage() {
  const user = useUser();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSessionInfo[]>([]);
  const entriesRef = useRef<Entry[]>([]);

  useEffect(() => {
    getStudentClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;
    Promise.all(classes.map((cls) => getSessionsByClass(cls.id).catch(() => [] as Session[])))
      .then((allSessions) => {
        const entries: Entry[] = [];
        for (let i = 0; i < allSessions.length; i++) {
          for (const s of allSessions[i]) {
            entries.push({ cls: classes[i], session: s });
          }
        }
        entriesRef.current = entries;
        const { foundActive, recent } = buildDashboardData(entries);
        setActiveSession(foundActive);
        setRecentSessions(recent);
      });
  }, [classes]);

  // 60초마다 시간 기반 상태 재계산
  useEffect(() => {
    const timer = setInterval(() => {
      const { foundActive, recent } = buildDashboardData(entriesRef.current);
      setActiveSession(foundActive);
      setRecentSessions(recent);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const dashboardUser = user ? { name: user.name ?? '학생' } : null;

  return (
    <StudentDashboard
      user={dashboardUser}
      classes={classes}
      activeSession={activeSession}
      recentSessions={recentSessions}
    />
  );
}
