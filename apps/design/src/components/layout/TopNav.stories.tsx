import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from './TopNav';
import { MOCK_TEACHER, MOCK_STUDENT } from '@/mock/data';

const meta: Meta<typeof TopNav> = {
  title: 'Layout/TopNav',
  component: TopNav,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
  tags: ['autodocs'],
  argTypes: {
    activePage: {
      control: 'select',
      options: [undefined, 'home', 'classes', 'grid'],
    },
    onSignOut: { action: '로그아웃' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Teacher ──────────────────────────────────────────────────────────────────

export const TeacherOnHome: Story = {
  name: '선생님 — 홈 활성',
  args: {
    user: MOCK_TEACHER,
    activePage: 'home',
  },
};

export const TeacherOnClasses: Story = {
  name: '선생님 — 클래스 활성',
  args: {
    user: MOCK_TEACHER,
    activePage: 'classes',
  },
};

// ─── Student ──────────────────────────────────────────────────────────────────

export const StudentOnHome: Story = {
  name: '학생 — 홈 활성',
  args: {
    user: MOCK_STUDENT,
    activePage: 'home',
  },
};

export const StudentOnClasses: Story = {
  name: '학생 — 클래스 활성',
  args: {
    user: MOCK_STUDENT,
    activePage: 'classes',
  },
};
