import type { Meta, StoryObj } from '@storybook/react';
import { StudentSessionList } from './StudentSessionList';

const MOCK_CLASS_INFO = {
  id: 1,
  subject: '영어',
  grade: 3,
  homeroom: '2반',
};

const MOCK_SESSIONS = [
  {
    id: 1,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 3일 영어 수업',
    status: 'ACTIVE' as const,
    explanation: '관계대명사 단원 학습',
    objective: '관계대명사 사용법 익히기',
    period: 3,
    scheduled_date: '2026-05-03',
  },
  {
    id: 2,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '4월 26일 영어 수업',
    status: 'FINISHED' as const,
    explanation: '동명사 단원 학습',
    period: 2,
    scheduled_date: '2026-04-26',
  },
  {
    id: 3,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 10일 영어 수업',
    status: 'PLANNING' as const,
    explanation: '수동태 단원 학습',
    period: 4,
    scheduled_date: '2026-05-10',
  },
];

const meta: Meta<typeof StudentSessionList> = {
  title: 'Students/StudentSessionList',
  component: StudentSessionList,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof StudentSessionList>;

export const WithActiveSession: Story = {
  args: {
    classId: '1',
    classInfo: MOCK_CLASS_INFO,
    sessions: MOCK_SESSIONS,
    onJoinSession: async (sessionId) => { console.log('join session', sessionId); },
  },
};

export const NoSessions: Story = {
  args: {
    classId: '1',
    classInfo: MOCK_CLASS_INFO,
    sessions: [],
    onJoinSession: async (sessionId) => { console.log('join session', sessionId); },
  },
};

export const SessionsTab: Story = {
  args: {
    classId: '1',
    classInfo: MOCK_CLASS_INFO,
    sessions: MOCK_SESSIONS,
    initialTab: 'sessions',
    onJoinSession: async (sessionId) => { console.log('join session', sessionId); },
  },
};
