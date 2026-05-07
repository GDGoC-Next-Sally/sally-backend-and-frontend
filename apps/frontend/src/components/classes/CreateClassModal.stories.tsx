import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CreateClassModal } from './CreateClassModal';

const meta: Meta<typeof CreateClassModal> = {
  title: 'Classes/CreateClassModal',
  component: CreateClassModal,
  decorators: [(Story) => <div style={{ minHeight: '100vh', position: 'relative' }}><Story /></div>],
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof CreateClassModal>;

export const Create: Story = {
  args: {
    mode: 'create',
    onClose: () => console.log('close'),
    onSubmit: (body) => console.log('submit', body),
  },
};

export const Edit: Story = {
  args: {
    mode: 'edit',
    classId: 1,
    initialData: { subject: '영어', theme: 2, grade: '고등 3학년', homeroom: '2반' },
    onClose: () => console.log('close'),
    onSubmit: (body) => console.log('submit', body),
  },
};
