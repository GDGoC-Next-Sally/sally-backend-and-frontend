import type { Meta, StoryObj } from '@storybook/react';
import { Dashboard } from './Dashboard';

const defaultClasses = [
  { id: 1, subject: '영어', grade: 3, homeroom: '2반' },
  { id: 2, subject: '수학', grade: 2, homeroom: '1반' },
];

const meta: Meta<typeof Dashboard> = {
  title: 'Dashboard/Dashboard',
  component: Dashboard,
  parameters: {
    nextjs: { appDirectory: true },
  },
  args: {
    classes: defaultClasses,
  },
};
export default meta;
type Story = StoryObj<typeof Dashboard>;

export const Empty: Story = {
  args: {
    todayClass: undefined,
  },
};

export const Upcoming: Story = {
  args: {
    todayClass: {
      status: 'upcoming',
      className: '3학년 2반',
      subject: '영어',
      period: 5,
    },
  },
};

export const Live: Story = {
  args: {
    todayClass: {
      status: 'live',
      className: '3학년 2반',
      subject: '영어',
      period: 5,
      studentCount: 28,
      aiNote: '수업 참여도가 평소보다 높아요!\n지금의 흐름을 유지하며 코칭해보세요.',
    },
  },
};

export const Completed: Story = {
  args: {
    todayClass: {
      status: 'completed',
      className: '3학년 2반',
      subject: '영어',
      period: 5,
    },
  },
};
