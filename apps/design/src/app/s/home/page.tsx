'use client';

/**
 * Student — Home page (design/mock)
 *
 * Downstream migration guide:
 *  1. Remove mock imports; fetch data from your server actions.
 *  2. Pass real data props to <StudentDashboard>.
 *  3. The <StudentDashboard> component needs zero changes.
 */
import { StudentDashboard } from '@/components/students/StudentDashboard';
import {
  MOCK_STUDENT,
  MOCK_STUDENT_CLASSES,
  MOCK_RECENT_SESSIONS,
  MOCK_PROGRESS,
  MOCK_TODAY_CLASS,
} from '@/mock/data';

export default function StudentHomePage() {
  return (
    <StudentDashboard
      user={MOCK_STUDENT}
      classes={MOCK_STUDENT_CLASSES}
      recentSessions={MOCK_RECENT_SESSIONS}
      progress={MOCK_PROGRESS}
      todayClass={MOCK_TODAY_CLASS}
      basePath="/s"
    />
  );
}
