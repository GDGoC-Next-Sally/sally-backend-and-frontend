import type { Meta, StoryObj } from '@storybook/react';
import { Dashboard } from './Dashboard';

const meta: Meta<typeof Dashboard> = {
  title: 'Dashboard/Dashboard',
  component: Dashboard,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof Dashboard>;

export const WithClasses: Story = {
  args: {
    classes: [
      { id: 1, subject: '영어', grade: 3, homeroom: '2반' },
      { id: 2, subject: '수학', grade: 2, homeroom: '1반' },
      { id: 3, subject: '과학', grade: 1, homeroom: '3반' },
    ],
  },
};

export const Empty: Story = {
  args: {
    classes: [],
  },
};

export const SingleClass: Story = {
  args: {
    classes: [
      { id: 1, subject: '국어', grade: 3, homeroom: '4반' },
    ],
  },
};
