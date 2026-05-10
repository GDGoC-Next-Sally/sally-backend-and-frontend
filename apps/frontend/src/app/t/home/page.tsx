'use client';

import { useState, useEffect, useRef } from 'react';
import { getTeacherClasses, type ClassItem } from '@/actions/classes';
import { getSessionsByClass, type Session } from '@/actions/sessions';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { computeSessionStatus } from '@/utils/sessionStatus';

interface TodayClassData {
  status: 'upcoming' | 'live';
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

export default function TeacherHomePage() {
  const [classes, setClasses] = useState<{ id: number; subject: string; grade: number | null; homeroom: string | null }[]>([]);
  const [todayClass, setTodayClass] = useState<TodayClassData | undefined>(undefined);
  const entriesRef = useRef<Entry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const classesData = await getTeacherClasses();
        setClasses(classesData);

        const results = await Promise.allSettled(
          classesData.map((cls) =>
            getSessionsByClass(cls.id).then((sessions) => ({ cls, sessions }))
          )
        );

        const entries: Entry[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const session of r.value.sessions) {
              entries.push({ cls: r.value.cls, session });
            }
          }
        }

        entriesRef.current = entries;
        setTodayClass(findNearestSession(entries));
      } catch {
        setClasses([]);
      }
    };
    load();
  }, []);

  // 60초마다 시간 기반 상태 재계산 (예정 → 진행중 등 자동 전환)
  useEffect(() => {
    const timer = setInterval(() => {
      setTodayClass(findNearestSession(entriesRef.current));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  return <Dashboard classes={classes} todayClass={todayClass} />;
}
