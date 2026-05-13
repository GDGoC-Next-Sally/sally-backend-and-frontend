import type { Meta, StoryObj } from '@storybook/react';
import { SessionGrid } from './SessionGrid';

// 피그마 기준 클래스 — [S1.5] 세션 목록
const MOCK_CLASS = {
  id: 1,
  subject: '영어',
  grade: undefined as unknown as number,
  homeroom: '영어 수업',
  status: 'ACTIVE' as const,
  explanation: '정규 수업 / 2026년 1학기',
  theme: 'mint',
  users: { id: 'teacher-1', name: '박수빈' },
};

// 피그마 기준 7개 세션: 진행중 2, 임시 예정 3, 종료 2
const MOCK_SESSIONS_ALL = [
  {
    id: 1,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 13일 영어 수업',
    status: 'ACTIVE' as const,
    explanation: '관계대명사 단원 학습',
    period: 3,
    scheduled_date: '2026-05-13',
    scheduled_start: '2026-05-13T09:00:00',
    scheduled_end: '2026-05-13T10:00:00',
  },
  {
    id: 2,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 13일 영어 수업 2교시',
    status: 'ACTIVE' as const,
    explanation: '수동태 단원 학습',
    period: 4,
    scheduled_date: '2026-05-13',
    scheduled_start: '2026-05-13T10:15:00',
    scheduled_end: '2026-05-13T11:00:00',
  },
  {
    id: 3,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 20일 영어 수업',
    status: 'PLANNING' as const,
    explanation: '동명사 단원 학습',
    period: 2,
    scheduled_date: '2026-05-20',
  },
  {
    id: 4,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 27일 영어 수업',
    status: 'PLANNING' as const,
    explanation: '현재완료 단원 학습',
    period: 3,
    scheduled_date: '2026-05-27',
  },
  {
    id: 5,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '6월 3일 영어 수업',
    status: 'PLANNING' as const,
    explanation: '접속사 단원 학습',
    period: 4,
    scheduled_date: '2026-06-03',
  },
  {
    id: 6,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '5월 6일 영어 수업',
    status: 'FINISHED' as const,
    explanation: '부정사 단원 학습',
    period: 2,
    scheduled_date: '2026-05-06',
  },
  {
    id: 7,
    class_id: 1,
    teacher_id: 'teacher-1',
    session_name: '4월 29일 영어 수업',
    status: 'FINISHED' as const,
    explanation: '분사 단원 학습',
    period: 3,
    scheduled_date: '2026-04-29',
  },
];

const meta: Meta<typeof SessionGrid> = {
  title: 'Sessions/SessionGrid',
  component: SessionGrid,
  parameters: {
    nextjs: { appDirectory: true },
  },
  args: {
    classId: 1,
    onDeleteSession: (id) => console.log('delete session', id),
    onCreateSession: (body) => console.log('create session', body),
    onUpdateSession: (id, body) => console.log('update session', id, body),
    onRefresh: () => console.log('refresh'),
  },
};
export default meta;
type Story = StoryObj<typeof SessionGrid>;

/** 피그마 기준 — 진행중 2, 임시 예정 3, 종료 2 */
export const Default: Story = {
  args: {
    classInfo: MOCK_CLASS,
    sessions: MOCK_SESSIONS_ALL,
  },
};

/** 빈 세션 목록 */
export const Empty: Story = {
  args: {
    classInfo: MOCK_CLASS,
    sessions: [],
  },
};

/** 클래스 정보 없음 */
export const NoClassInfo: Story = {
  args: {
    classInfo: null,
    sessions: [],
  },
};

/** 진행중 세션만 */
export const LiveOnly: Story = {
  args: {
    classInfo: MOCK_CLASS,
    sessions: MOCK_SESSIONS_ALL.filter((s) => s.status === 'ACTIVE'),
  },
};

/** 임시 예정 세션만 */
export const UpcomingOnly: Story = {
  args: {
    classInfo: MOCK_CLASS,
    sessions: MOCK_SESSIONS_ALL.filter((s) => s.status === 'PLANNING'),
  },
};

/** 종료된 세션만 */
export const FinishedOnly: Story = {
  args: {
    classInfo: MOCK_CLASS,
    sessions: MOCK_SESSIONS_ALL.filter((s) => s.status === 'FINISHED'),
  },
};
