import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SessionModal } from './SessionModal';

const meta: Meta<typeof SessionModal> = {
  title: 'Sessions/SessionModal',
  component: SessionModal,
  decorators: [(Story) => <div style={{ minHeight: '100vh', position: 'relative' }}><Story /></div>],
  parameters: {
    nextjs: { appDirectory: true },
  },
};
export default meta;
type Story = StoryObj<typeof SessionModal>;

export const Create: Story = {
  args: {
    classId: 1,
    onClose: () => console.log('close'),
    onSubmit: (body) => console.log('submit', body),
  },
};

export const Edit: Story = {
  args: {
    classId: 1,
    session: {
      id: 1,
      class_id: 1,
      teacher_id: 'teacher-1',
      session_name: '5월 3일 영어 수업',
      status: 'PLANNING' as const,
      explanation: '관계대명사 단원 학습',
      objective: '관계대명사 사용법 익히기',
      period: 3,
      scheduled_date: '2026-05-03',
      scheduled_start: '2026-05-03T13:30:00',
      scheduled_end: '2026-05-03T14:15:00',
    },
    onClose: () => console.log('close'),
    onSubmit: (body) => console.log('submit', body),
  },
};
