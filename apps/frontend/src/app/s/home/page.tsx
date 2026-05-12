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

export interface TodayClassData {
  status: 'upcoming' | 'live' | 'completed';
  className: string;
  subject: string;
  period: number;
  sessionId: number;
  classId: number;
}

type Entry = { cls: ClassItem; session: Session };

function findNearestSession(entries: Entry[]): TodayClassData | undefined {
  const valid = entries
    .map((e) => ({ ...e, computed: computeSessionStatus(e.session) }))
    .filter((e) => e.computed !== 'finished');

  valid.sort((a, b) => {
    if (a.computed === 'live' && b.computed !== 'live') return -1;
    if (b.computed === 'live' && a.computed !== 'live') return 1;
    const da = a.session.scheduled_start ?? a.session.scheduled_date ?? '';
    const db = b.session.scheduled_start ?? b.session.scheduled_date ?? '';
    return da.localeCompare(db);
  });

  if (valid.length === 0) return undefined;

  const { cls, session, computed } = valid[0];
  return {
    status: computed === 'live' ? 'live' : 'upcoming',
    className: `${cls.grade ? `${cls.grade}학년 ` : ''}${cls.homeroom ?? ''}`.trim(),
    subject: cls.subject,
    period: session.period ?? 0,
    sessionId: session.id,
    classId: cls.id,
  };
}

function buildDashboardData(entries: Entry[]) {
  const visited: RecentSessionInfo[] = [];

  for (const { cls, session: s } of entries) {
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

  return { todayClass: findNearestSession(entries), recent: visited.slice(0, 3) };
}

export default function StudentHomePage() {
  const user = useUser();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [todayClass, setTodayClass] = useState<TodayClassData | undefined>(undefined);
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
        const { todayClass: tc, recent } = buildDashboardData(entries);
        setTodayClass(tc);
        setRecentSessions(recent);
      });
  }, [classes]);

  // 60초마다 시간 기반 상태 재계산
  useEffect(() => {
    const timer = setInterval(() => {
      const { todayClass: tc, recent } = buildDashboardData(entriesRef.current);
      setTodayClass(tc);
      setRecentSessions(recent);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const dashboardUser = user ? { name: user.name ?? '학생' } : null;

  return (
    <StudentDashboard
      user={dashboardUser}
      classes={classes}
      todayClass={todayClass}
      recentSessions={recentSessions}
    />
  );
}
