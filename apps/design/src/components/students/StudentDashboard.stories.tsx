import type { Meta, StoryObj } from '@storybook/react';
import { StudentDashboard } from './StudentDashboard';
import {
  MOCK_STUDENT,
  MOCK_STUDENT_CLASSES,
  MOCK_RECENT_SESSIONS,
  MOCK_PROGRESS,
  MOCK_TODAY_CLASS,
} from '@/mock/data';

const meta: Meta<typeof StudentDashboard> = {
  title: 'Students/StudentDashboard',
  component: StudentDashboard,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default: live class is happening now ─────────────────────────────────────

export const Default: Story = {
  name: '기본 — 진행 중인 수업 있음',
  args: {
    user:           MOCK_STUDENT,
    classes:        MOCK_STUDENT_CLASSES,
    recentSessions: MOCK_RECENT_SESSIONS,
    progress:       MOCK_PROGRESS,
    todayClass:     MOCK_TODAY_CLASS,
    basePath:       '/s',
  },
};

// ─── No live class today ──────────────────────────────────────────────────────

export const NoLiveClass: Story = {
  name: '진행 중인 수업 없음',
  args: {
    user:           MOCK_STUDENT,
    classes:        MOCK_STUDENT_CLASSES,
    recentSessions: MOCK_RECENT_SESSIONS,
    progress:       MOCK_PROGRESS,
    todayClass:     undefined,
    basePath:       '/s',
  },
};

// ─── No classes joined yet ────────────────────────────────────────────────────

export const NoClasses: Story = {
  name: '클래스 미가입 상태',
  args: {
    user:           MOCK_STUDENT,
    classes:        [],
    recentSessions: [],
    progress:       { value: 0, delta: 0 },
    todayClass:     undefined,
    basePath:       '/s',
  },
};

// ─── High achiever ────────────────────────────────────────────────────────────

export const HighProgress: Story = {
  name: '학습 진도 높음 (96%)',
  args: {
    user:           MOCK_STUDENT,
    classes:        MOCK_STUDENT_CLASSES,
    recentSessions: MOCK_RECENT_SESSIONS,
    progress:       { value: 96, delta: 12 },
    todayClass:     MOCK_TODAY_CLASS,
    basePath:       '/s',
  },
};
