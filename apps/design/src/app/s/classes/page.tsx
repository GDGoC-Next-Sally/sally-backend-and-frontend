'use client';

/**
 * Student — Classes page (design/mock)
 * Reuses the same ClassList component as the teacher view;
 * student callbacks can be no-ops in design mode.
 */
import { useState } from 'react';
import { ClassList } from '@/components/classes/ClassList';
import { MOCK_STUDENT_CLASSES, MOCK_STUDENTS } from '@/mock/data';
import type { ClassItem } from '@/mock/types';

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>(MOCK_STUDENT_CLASSES);

  return (
    <ClassList
      classes={classes}
      students={MOCK_STUDENTS}
      onCreateClass={() => {}}
      onUpdateClass={() => {}}
      onDeleteClass={(id) => setClasses((prev) => prev.filter((c) => c.id !== id))}
      onRefreshCode={() => {}}
      onToggleRegisterable={() => {}}
      basePath="/s"
    />
  );
}
