import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { JoinClassModal } from './JoinClassModal';

const meta: Meta<typeof JoinClassModal> = {
  title: 'Students/JoinClassModal',
  component: JoinClassModal,
  decorators: [(Story) => <div style={{ minHeight: '100vh', position: 'relative' }}><Story /></div>],
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof JoinClassModal>;

export const Default: Story = {
  args: {
    onClose: () => console.log('close'),
    onJoin: async (code) => { console.log('join with code', code); },
  },
};

export const WithError: Story = {
  args: {
    onClose: () => console.log('close'),
    onJoin: async (code) => {
      throw new Error('유효하지 않은 코드입니다.');
    },
  },
};
