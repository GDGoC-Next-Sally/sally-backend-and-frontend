'use client';

import { useState, useEffect } from 'react';
import { getStudentClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { useUser } from '@/utils/useUser';
import { StudentDashboard } from '@/components/students/StudentDashboard';

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
}

export default function StudentHomePage() {
  const user = useUser();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSessionInfo[]>([]);

  useEffect(() => {
    getStudentClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;
    Promise.all(classes.map((cls) => getSessionsByClass(cls.id).catch(() => [] as Session[])))
      .then((allSessions) => {
        let foundActive: ActiveSessionInfo | null = null;
        const visited: RecentSessionInfo[] = [];

        for (let i = 0; i < allSessions.length; i++) {
          const cls = classes[i];
          for (const s of allSessions[i]) {
            if (s.status === 'ACTIVE' && !foundActive) {
              foundActive = { id: s.id, classId: cls.id, subject: cls.subject, period: s.period };
            }
            if (s.status === 'ACTIVE' || s.status === 'FINISHED') {
              visited.push({
                id: s.id,
                classId: cls.id,
                subject: cls.subject,
                sessionName: s.session_name,
                period: s.period,
                status: s.status,
              });
            }
          }
        }

        visited.sort((a, b) => {
          // ACTIVE first, then by id descending (newer sessions have higher ids)
          if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
          if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
          return b.id - a.id;
        });

        setActiveSession(foundActive);
        setRecentSessions(visited.slice(0, 3));
      });
  }, [classes]);

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
