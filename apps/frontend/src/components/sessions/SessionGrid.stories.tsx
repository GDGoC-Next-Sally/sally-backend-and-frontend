import type { Meta, StoryObj } from '@storybook/react';
import { SessionGrid } from './SessionGrid';

const MOCK_CLASS = {
  id: 1,
  subject: '영어',
  grade: 3,
  homeroom: '2반',
  status: 'ACTIVE' as const,
  explanation: '정규 수업 / 2026년 1학기',
  theme: 'mint',
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
    scheduled_start: '2026-05-03T13:30:00',
    scheduled_end: '2026-05-03T14:15:00',
  },
  {
    id: 2,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 10일 영어 수업',
    status: 'PLANNING' as const,
    explanation: '수동태 단원 학습',
    period: 4,
    scheduled_date: '2026-05-10',
  },
  {
    id: 3,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '4월 26일 영어 수업',
    status: 'FINISHED' as const,
    explanation: '동명사 단원 학습',
    period: 2,
    scheduled_date: '2026-04-26',
  },
];

const meta: Meta<typeof SessionGrid> = {
  title: 'Sessions/SessionGrid',
  component: SessionGrid,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof SessionGrid>;

export const WithSessions: Story = {
  args: {
    classId: 1,
    classInfo: MOCK_CLASS,
    sessions: MOCK_SESSIONS,
    onDeleteSession: (id) => console.log('delete session', id),
    onCreateSession: (body) => console.log('create session', body),
    onUpdateSession: (id, body) => console.log('update session', id, body),
    onRefresh: () => console.log('refresh'),
  },
};

export const Empty: Story = {
  args: {
    classId: 1,
    classInfo: MOCK_CLASS,
    sessions: [],
    onDeleteSession: (id) => console.log('delete session', id),
    onCreateSession: (body) => console.log('create session', body),
    onUpdateSession: (id, body) => console.log('update session', id, body),
    onRefresh: () => console.log('refresh'),
  },
};

export const NoClassInfo: Story = {
  args: {
    classId: 1,
    classInfo: null,
    sessions: [],
    onDeleteSession: (id) => console.log('delete session', id),
    onCreateSession: (body) => console.log('create session', body),
    onUpdateSession: (id, body) => console.log('update session', id, body),
    onRefresh: () => console.log('refresh'),
  },
};
