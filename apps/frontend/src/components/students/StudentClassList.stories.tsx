import type { Meta, StoryObj } from '@storybook/react';
import { StudentClassList } from './StudentClassList';

const MOCK_CLASSES = [
  {
    id: 1,
    subject: '영어',
    grade: 3,
    homeroom: '2반',
    status: 'ACTIVE' as const,
    explanation: '정규 수업',
    theme: 'mint',
    schedule: '월1, 화4',
    teacher: '박선생님',
  },
  {
    id: 2,
    subject: '수학',
    grade: 3,
    homeroom: '2반',
    status: 'PLANNING' as const,
    explanation: '정규 수업',
    theme: 'lavender',
    schedule: '수2, 금3',
    teacher: '김선생님',
  },
];

const meta: Meta<typeof StudentClassList> = {
  title: 'Students/StudentClassList',
  component: StudentClassList,
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof StudentClassList>;

export const WithClasses: Story = {
  args: {
    classes: MOCK_CLASSES,
    onLeaveClass: (id) => console.log('leave class', id),
    onRefresh: () => console.log('refresh'),
  },
};

export const Empty: Story = {
  args: {
    classes: [],
    onLeaveClass: (id) => console.log('leave class', id),
    onRefresh: () => console.log('refresh'),
  },
};
