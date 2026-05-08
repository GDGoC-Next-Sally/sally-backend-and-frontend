import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StudentSessionEndModal } from './StudentSessionEndModal';

const meta: Meta<typeof StudentSessionEndModal> = {
  title: 'Students/StudentSessionEndModal',
  component: StudentSessionEndModal,
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    nextjs: { appDirectory: true },
  },
  argTypes: {
    onClose: { action: 'onClose' },
    onNext: { action: 'onNext' },
  },
};
export default meta;
type Story = StoryObj<typeof StudentSessionEndModal>;

/** 피그마 기준 — 수업 종료 모달 */
export const Default: Story = {
  args: {
    onClose: () => console.log('close'),
    onNext: () => console.log('next'),
  },
};
