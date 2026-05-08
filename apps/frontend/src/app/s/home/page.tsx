'use client';

import { useState, useEffect } from 'react';
import { getStudentClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass } from '@/actions/sessions';
import { useUser } from '@/utils/useUser';
import { StudentDashboard } from '@/components/students/StudentDashboard';

interface ActiveSessionInfo {
  id: number;
  classId: number;
  subject: string;
  period?: number | null;
}

export default function StudentHomePage() {
  const user = useUser();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);

  useEffect(() => {
    getStudentClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;
    Promise.all(classes.map((cls) => getSessionsByClass(cls.id).catch(() => [])))
      .then((allSessions) => {
        for (let i = 0; i < allSessions.length; i++) {
          const active = allSessions[i].find((s) => s.status === 'ACTIVE');
          if (active) {
            setActiveSession({
              id: active.id,
              classId: classes[i].id,
              subject: classes[i].subject,
              period: active.period,
            });
            return;
          }
        }
        setActiveSession(null);
      });
  }, [classes]);

  const dashboardUser = user ? { name: user.name ?? '학생' } : null;

  return <StudentDashboard user={dashboardUser} classes={classes} activeSession={activeSession} />;
}
