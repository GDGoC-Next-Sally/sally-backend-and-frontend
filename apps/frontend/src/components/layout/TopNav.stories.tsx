import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from './TopNav';

const meta: Meta<typeof TopNav> = {
  title: 'Layout/TopNav',
  component: TopNav,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/t/home' } },
  },
};
export default meta;
type Story = StoryObj<typeof TopNav>;

export const TeacherHome: Story = {
  args: {
    user: { name: '김선생', email: 'teacher@example.com', role: 'teacher' },
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/t/home' } },
  },
};

export const TeacherClasses: Story = {
  args: {
    user: { name: '김선생', email: 'teacher@example.com', role: 'teacher' },
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/t/classes' } },
  },
};

export const Student: Story = {
  args: {
    user: { name: '이학생', email: 'student@example.com', role: 'student' },
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/s/home' } },
  },
};

export const NotLoggedIn: Story = {
  args: {
    user: null,
    onSignOut: undefined,
  },
};
