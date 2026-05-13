import type { Meta, StoryObj } from '@storybook/react';
import { SessionWidget } from './SessionWidget';

const MOCK_STUDENTS = [
  { userId: 'user-1', name: '김학생', joinedAt: '2026-05-13T13:20:00' },
  { userId: 'user-2', name: '이학생', joinedAt: '2026-05-13T13:22:00' },
  { userId: 'user-3', name: '박학생', joinedAt: '2026-05-13T13:25:00' },
  { userId: 'user-4', name: '최학생', joinedAt: '2026-05-13T13:26:00' },
  { userId: 'user-5', name: '정학생', joinedAt: '2026-05-13T13:27:00' },
];

const meta: Meta<typeof SessionWidget> = {
  title: 'Sessions/SessionWidget',
  component: SessionWidget,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/t/classes/1/sessions/1' } },
    layout: 'fullscreen',
  },
  args: {
    classId: '1',
    sessionId: '1',
    sessionName: '5월 13일 영어 수업',
    sessionDescription: '관계대명사 단원 학습 중',
    onStart: async () => { console.log('start session'); },
    onFinish: async () => { console.log('finish session'); },
    onRefreshStudents: async () => { console.log('refresh students'); },
  },
};
export default meta;
type Story = StoryObj<typeof SessionWidget>;

/** 피그마 기준 — 학생 입장 대기 중 (시작 예정 정보 포함) */
export const WaitingPhase: Story = {
  args: {
    initialPhase: 'waiting',
    students: MOCK_STUDENTS,
    scheduledStart: '2026-05-13T13:30:00',
    joinableFrom: '2026-05-13T13:20:00',
    estimatedMinutes: 45,
  },
};

/** 세션이 진행 중인 상태 */
export const ActivePhase: Story = {
  args: {
    initialPhase: 'active',
    students: MOCK_STUDENTS,
  },
};

/** 아직 입장한 학생이 없는 상태 */
export const NoStudents: Story = {
  args: {
    initialPhase: 'waiting',
    students: [],
    scheduledStart: '2026-05-13T13:30:00',
    joinableFrom: '2026-05-13T13:20:00',
    estimatedMinutes: 45,
  },
};

/** 세션 시작 버튼을 눌러 로딩 중인 상태 */
export const Loading: Story = {
  args: {
    initialPhase: 'waiting',
    students: MOCK_STUDENTS,
    scheduledStart: '2026-05-13T13:30:00',
    joinableFrom: '2026-05-13T13:20:00',
    estimatedMinutes: 45,
    onStart: () => new Promise(() => {}),
  },
};

/** 세션 시작 실패 (에러) 상태 */
export const ErrorOnStart: Story = {
  args: {
    initialPhase: 'waiting',
    students: MOCK_STUDENTS,
    scheduledStart: '2026-05-13T13:30:00',
    onStart: async () => { throw new Error('서버 연결에 실패했습니다.'); },
  },
};
