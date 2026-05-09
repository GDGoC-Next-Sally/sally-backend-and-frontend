import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from './TopNav';

const meta: Meta<typeof TopNav> = {
  title: 'Layout/TopNav',
  component: TopNav,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/t/home' } },
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof TopNav>;

const teacherUser = {
  name: '김샐리',
  email: 'teacher@example.com',
  role: 'teacher' as const,
};

const studentUser = {
  name: '이학생',
  email: 'student@example.com',
  role: 'student' as const,
};

/** 로그인 전 상태 */
export const NotLoggedIn: Story = {
  args: {
    user: null,
  },
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
  },
};

/** 선생님 - 홈 대시보드 활성화 */
export const TeacherHome: Story = {
  args: {
    user: teacherUser,
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/t/home' } },
  },
};

/** 선생님 - 내 클래스 관리 활성화 */
export const TeacherClasses: Story = {
  args: {
    user: teacherUser,
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/t/classes' } },
  },
};

/** 선생님 - 분석 리포트 활성화 */
export const TeacherReport: Story = {
  args: {
    user: teacherUser,
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/t/reports' } },
  },
};

/** 학생 - 홈 대시보드 활성화 */
export const StudentHome: Story = {
  args: {
    user: studentUser,
    onSignOut: () => alert('로그아웃'),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/s/home' } },
  },
};
