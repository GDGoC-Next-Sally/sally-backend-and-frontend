'use client';

import { useState, useEffect } from 'react';
import { getStudentClasses, type ClassItem } from '@/actions/classes';
import { useUser } from '@/utils/useUser';
import { StudentDashboard } from '@/components/students/StudentDashboard';

export default function StudentHomePage() {
  const user = useUser();
  const [classes, setClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    getStudentClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const dashboardUser = user ? { name: user.name ?? '학생' } : null;

  return <StudentDashboard user={dashboardUser} classes={classes} />;
}
