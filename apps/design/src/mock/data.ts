import type {
  User,
  ClassItem,
  Student,
  RecentSession,
  LiveClass,
  ProgressData,
  InviteCodeData,
} from './types';

// ─── Users ────────────────────────────────────────────────────────────────────

export const MOCK_TEACHER: User = {
  id: 'teacher-1',
  name: '김하린',
  email: 'harin.kim@school.kr',
  role: 'teacher',
};

export const MOCK_STUDENT: User = {
  id: 'student-1',
  name: '이준혁',
  email: 'junhyeok.lee@school.kr',
  role: 'student',
};

// ─── Classes ──────────────────────────────────────────────────────────────────

export const MOCK_CLASSES: ClassItem[] = [
  {
    id: 1,
    invite_code: 'AB12CD',
    registerable: true,
    status: 'ACTIVE',
    grade: 3,
    homeroom: '2반',
    subject: '영어',
    explanation: '정규 수업 / 2026년 1학기',
    theme: 'lavender',
    created_at: '2026-03-01T09:00:00Z',
    schedule: '월1, 화4, 수4, 금4',
  },
  {
    id: 2,
    invite_code: 'EF34GH',
    registerable: false,
    status: 'ACTIVE',
    grade: 3,
    homeroom: '2반',
    subject: '수학',
    explanation: '정규 수업 / 2026년 1학기',
    theme: 'mint',
    created_at: '2026-03-01T10:00:00Z',
    schedule: '화2, 목3',
  },
  {
    id: 3,
    invite_code: 'IJ56KL',
    registerable: true,
    status: 'PLANNING',
    grade: 2,
    homeroom: '1반',
    subject: '과학',
    explanation: '정규 수업 / 2026년 1학기',
    theme: 'sky',
    created_at: '2026-03-02T08:00:00Z',
    schedule: '수2, 금1',
  },
  {
    id: 4,
    invite_code: 'MN78OP',
    registerable: false,
    status: 'COMPLETED',
    grade: 1,
    homeroom: '3반',
    subject: '국어',
    explanation: '정규 수업 / 2025년 2학기',
    theme: 'peach',
    created_at: '2025-09-01T08:00:00Z',
    schedule: '월3, 수5, 금2',
  },
  {
    id: 5,
    invite_code: 'QR90ST',
    registerable: true,
    status: 'ACTIVE',
    grade: 3,
    homeroom: '4반',
    subject: '사회',
    explanation: '보충 / 2026년 1학기',
    theme: 'slate',
    created_at: '2026-03-05T09:00:00Z',
    schedule: '목5',
  },
];

// ─── Students (for teacher sidebar) ───────────────────────────────────────────

export const MOCK_STUDENTS: Student[] = [
  {
    id: 1,
    name: '김민지',
    progress: 82,
    active: true,
    summary: '어휘 이해도 우수. 독해 속도 개선 필요. 최근 퀴즈 평균 88점.',
  },
  {
    id: 2,
    name: '이준혁',
    progress: 67,
    active: true,
    summary: '기초 문법 복습 중. 꾸준한 참여율 높음. 서술형 보완 권장.',
  },
  {
    id: 3,
    name: '박서연',
    progress: 91,
    active: true,
    summary: '전 영역 고른 성취. 심화 과제 도전 권장. 발표 참여 우수.',
  },
  {
    id: 4,
    name: '최도윤',
    progress: 54,
    active: false,
    summary: '최근 접속 빈도 낮음. 단원 정리 자료 확인 권고.',
  },
];

// ─── Invite code data ─────────────────────────────────────────────────────────

export const MOCK_INVITE_CODE_DATA: InviteCodeData = {
  invite_code: 'AB12CD',
  registerable: true,
  currentStudents: 26,
  maxStudents: 50,
};

// ─── Student dashboard data ───────────────────────────────────────────────────

export const MOCK_STUDENT_CLASSES: ClassItem[] = [
  {
    id: 1,
    invite_code: 'AB12CD',
    registerable: true,
    status: 'ACTIVE',
    grade: 3,
    homeroom: '2반',
    subject: '영어',
    explanation: '박수빈 선생님',
    theme: 'lavender',
    created_at: '2026-03-01T09:00:00Z',
    schedule: '월1, 화4, 수4, 금4',
  },
  {
    id: 2,
    invite_code: 'EF34GH',
    registerable: false,
    status: 'ACTIVE',
    grade: 3,
    homeroom: '2반',
    subject: '수학',
    explanation: '김하린 선생님',
    theme: 'mint',
    created_at: '2026-03-01T10:00:00Z',
    schedule: '화2, 목3',
  },
  {
    id: 3,
    invite_code: 'IJ56KL',
    registerable: true,
    status: 'ACTIVE',
    grade: 3,
    homeroom: '2반',
    subject: '과학',
    explanation: '이수민 선생님',
    theme: 'sky',
    created_at: '2026-03-02T08:00:00Z',
    schedule: '수2, 금1',
  },
];

export const MOCK_RECENT_SESSIONS: RecentSession[] = [
  { title: '3학년 2반 수학', teacher: '김하린 선생님 | 2교시', status: '종료', type: 'done' },
  { title: '3학년 2반 영어', teacher: '박수빈 선생님 | 3교시', status: '진행 중', type: 'live' },
  { title: '3학년 2반 과학', teacher: '이수민 선생님 | 4교시', status: '대기 중', type: 'wait' },
];

export const MOCK_PROGRESS: ProgressData = {
  value: 78,
  delta: 6,
};

export const MOCK_TODAY_CLASS: LiveClass = {
  subject: '영어',
  period: 3,
  studentCount: 28,
};
