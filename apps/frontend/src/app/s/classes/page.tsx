'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStudentClasses, leaveClass, type ClassItem } from '@/actions/classes';
import { StudentClassList } from '@/components/students/StudentClassList';
import { PageContainer } from '@/components/layout/PageContainer';

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const fetchClasses = useCallback(() => {
    getStudentClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleLeave = async (id: number) => {
    try {
      await leaveClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '클래스 나가기에 실패했습니다.');
    }
  };

  return (
    <PageContainer>
      <StudentClassList
        classes={classes}
        onLeaveClass={handleLeave}
        onRefresh={fetchClasses}
      />
    </PageContainer>
  );
}
