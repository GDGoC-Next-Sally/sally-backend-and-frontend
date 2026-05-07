import type { Meta, StoryObj } from '@storybook/react';
import { StudentDashboard } from './StudentDashboard';

const MOCK_CLASSES = [
  { id: 1, subject: '영어', grade: 3, homeroom: '2반', status: 'ACTIVE' as const },
  { id: 2, subject: '수학', grade: 3, homeroom: '2반', status: 'PLANNING' as const },
  { id: 3, subject: '과학', grade: 3, homeroom: '2반', status: 'ACTIVE' as const },
];

const meta: Meta<typeof StudentDashboard> = {
  title: 'Students/StudentDashboard',
  component: StudentDashboard,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof StudentDashboard>;

export const WithClasses: Story = {
  args: {
    user: { name: '이학생' },
    classes: MOCK_CLASSES,
  },
};

export const NoClasses: Story = {
  args: {
    user: { name: '이학생' },
    classes: [],
  },
};

export const NotLoggedIn: Story = {
  args: {
    user: null,
    classes: [],
  },
};
