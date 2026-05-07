'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getTeacherClasses,
  createClass,
  updateClass,
  deleteClass,
  refreshInviteCode,
  toggleRegisterable,
  type ClassItem,
  type CreateClassBody,
} from '@/actions/classes';
import { ClassList } from '@/components/classes/ClassList';

const MOCK_STUDENTS = [
  { id: 1, name: '김학생', progress: 40, active: true, summary: '학생별 개별 성취도 요약' },
  { id: 2, name: '이학생', progress: 65, active: true, summary: '학생별 개별 성취도 요약' },
];

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const fetchClasses = useCallback(() => {
    getTeacherClasses()
      .then((data) => setClasses(data.map((c) => ({ ...c, schedule: c.schedule || '월1, 화4, 수4, 금4' })) as ClassItem[]))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleCreateClass = async (data: CreateClassBody) => {
    try {
      const newClass = await createClass(data);
      setClasses((prev) => [...prev, newClass]);
    } catch {
      alert('클래스 생성에 실패했습니다.');
    }
  };

  const handleUpdateClass = async (id: number, data: Partial<CreateClassBody>) => {
    try {
      const updated = await updateClass(id, data);
      setClasses((prev) => prev.map((c) => c.id === id ? { ...c, ...updated } : c));
    } catch {
      alert('클래스 수정에 실패했습니다.');
    }
  };

  const handleDeleteClass = async (id: number) => {
    try {
      await deleteClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleRefreshCode = async (classId: number) => {
    try {
      const data = await refreshInviteCode(classId);
      setClasses((prev) => prev.map((c) => c.id === classId ? { ...c, invite_code: data.invite_code } : c));
    } catch {
      alert('재발급에 실패했습니다.');
    }
  };

  const handleToggleRegisterable = async (classId: number) => {
    try {
      await toggleRegisterable(classId);
      setClasses((prev) => prev.map((c) => c.id === classId ? { ...c, registerable: !c.registerable } : c));
    } catch {
      alert('설정 변경에 실패했습니다.');
    }
  };

  return (
    <ClassList
      classes={classes}
      students={MOCK_STUDENTS}
      onCreateClass={handleCreateClass}
      onUpdateClass={handleUpdateClass}
      onDeleteClass={handleDeleteClass}
      onRefreshCode={handleRefreshCode}
      onToggleRegisterable={handleToggleRegisterable}
    />
  );
}
