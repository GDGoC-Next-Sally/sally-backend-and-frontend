import type { Meta, StoryObj } from '@storybook/react';
import { SessionWidget } from './SessionWidget';

const MOCK_STUDENTS = [
  { userId: 'user-1', name: '김학생', joinedAt: '2026-05-03T13:20:00' },
  { userId: 'user-2', name: '이학생', joinedAt: '2026-05-03T13:22:00' },
  { userId: 'user-3', name: '박학생', joinedAt: '2026-05-03T13:25:00' },
];

const meta: Meta<typeof SessionWidget> = {
  title: 'Sessions/SessionWidget',
  component: SessionWidget,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/t/classes/1/sessions/1' } },
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof SessionWidget>;

export const WaitingPhase: Story = {
  args: {
    classId: '1',
    sessionId: '1',
    initialPhase: 'waiting',
    students: MOCK_STUDENTS,
    onStart: async () => { console.log('start session'); },
    onFinish: async () => { console.log('finish session'); },
    onRefreshStudents: async () => { console.log('refresh students'); },
  },
};

export const ActivePhase: Story = {
  args: {
    classId: '1',
    sessionId: '1',
    initialPhase: 'active',
    students: MOCK_STUDENTS,
    onStart: async () => { console.log('start session'); },
    onFinish: async () => { console.log('finish session'); },
    onRefreshStudents: async () => { console.log('refresh students'); },
  },
};

export const NoStudents: Story = {
  args: {
    classId: '1',
    sessionId: '1',
    initialPhase: 'waiting',
    students: [],
    onStart: async () => { console.log('start session'); },
    onFinish: async () => { console.log('finish session'); },
    onRefreshStudents: async () => { console.log('refresh students'); },
  },
};
