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

/** 학생 입장 대기 중인 상태 */
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

/** 세션이 진행 중인 상태 */
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

/** 아직 입장한 학생이 없는 상태 */
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

/** 세션 시작 버튼을 눌러 로딩 중인 상태 */
export const Loading: Story = {
  args: {
    classId: '1',
    sessionId: '1',
    initialPhase: 'waiting',
    students: MOCK_STUDENTS,
    onStart: () => new Promise(() => {}), // 영원히 pending → 로딩 UI 유지
    onFinish: async () => {},
    onRefreshStudents: async () => {},
  },
};

/** 세션 시작 실패 (에러) 상태 — alert 발생 후 UI 확인용 */
export const ErrorOnStart: Story = {
  args: {
    classId: '1',
    sessionId: '1',
    initialPhase: 'waiting',
    students: MOCK_STUDENTS,
    onStart: async () => { throw new Error('서버 연결에 실패했습니다.'); },
    onFinish: async () => {},
    onRefreshStudents: async () => {},
  },
};
