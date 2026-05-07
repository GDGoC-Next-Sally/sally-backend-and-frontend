import type { Meta, StoryObj } from '@storybook/react';
import { CreateClassModal } from './CreateClassModal';

const meta: Meta<typeof CreateClassModal> = {
  title: 'Classes/CreateClassModal',
  component: CreateClassModal,
  parameters: {
    layout: 'centered',
    nextjs: { appDirectory: true },
  },
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'radio', options: ['create', 'edit'] },
    onClose:  { action: 'onClose' },
    onSubmit: { action: 'onSubmit' },
  },
  // Keep modal visible by default (don't unmount on close in Storybook)
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  name: '클래스 생성',
  args: {
    mode: 'create',
  },
};

export const Edit: Story = {
  name: '클래스 수정',
  args: {
    mode: 'edit',
    initialData: {
      subject: '3학년 영어',
      grade: '중등 3학년',
      homeroom: '2반',
      theme: 1,
      classType: '정규 수업',
    },
  },
};
