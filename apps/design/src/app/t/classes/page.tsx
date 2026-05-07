'use client';

/**
 * Teacher — Classes page (design/mock)
 *
 * Downstream migration guide:
 *  1. Remove mock imports; fetch `classes` + `students` from your server actions.
 *  2. Replace the local-state mutation handlers with real server action calls.
 *  3. The <ClassList> component itself needs zero changes.
 */
import { useState } from 'react';
import { ClassList } from '@/components/classes/ClassList';
import {
  MOCK_CLASSES,
  MOCK_STUDENTS,
} from '@/mock/data';
import type { ClassItem, ClassFormData } from '@/mock/types';

export default function TeacherClassesPage() {
  // In the real app this state comes from your server / data layer.
  const [classes, setClasses] = useState<ClassItem[]>(MOCK_CLASSES);

  const handleCreate = (data: ClassFormData) => {
    const newClass: ClassItem = {
      id: Date.now(),
      invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      registerable: true,
      status: 'PLANNING',
      grade: parseInt(data.grade.match(/\d/)?.[0] ?? '1', 10),
      homeroom: data.homeroom || null,
      subject: data.subject,
      explanation: `${data.classType} / ${data.semester}`,
      theme: ['slate','lavender','mint','peach','sky'][data.theme] ?? 'slate',
      created_at: new Date().toISOString(),
      schedule: '미정',
    };
    setClasses((prev) => [newClass, ...prev]);
  };

  const handleUpdate = (id: number, data: ClassFormData) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, subject: data.subject, homeroom: data.homeroom || null }
          : c
      )
    );
  };

  const handleDelete = (id: number) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRefreshCode = (classId: number) => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, invite_code: newCode } : c))
    );
  };

  const handleToggleRegisterable = (classId: number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, registerable: !c.registerable } : c))
    );
  };

  return (
    <ClassList
      classes={classes}
      students={MOCK_STUDENTS}
      onCreateClass={handleCreate}
      onUpdateClass={handleUpdate}
      onDeleteClass={handleDelete}
      onRefreshCode={handleRefreshCode}
      onToggleRegisterable={handleToggleRegisterable}
      basePath="/t"
    />
  );
}
