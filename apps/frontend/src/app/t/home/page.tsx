'use client';

import { useState, useEffect } from 'react';
import { getTeacherClasses } from '@/actions/classes';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function TeacherHomePage() {
  const [classes, setClasses] = useState<{ id: number; subject: string; grade: number | null; homeroom: string | null }[]>([]);

  useEffect(() => {
    getTeacherClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  return <Dashboard classes={classes} />;
}
