import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CreateSessionModal } from './CreateSessionModal';

const meta: Meta<typeof CreateSessionModal> = {
  title: 'Sessions/CreateSessionModal',
  component: CreateSessionModal,
  decorators: [(Story) => <div style={{ minHeight: '100vh', position: 'relative' }}><Story /></div>],
  parameters: {
    nextjs: { appDirectory: true },
  },
  args: {
    classId: 1,
    onClose: () => console.log('close'),
    onSubmit: (body) => console.log('submit', body),
  },
};
export default meta;
type Story = StoryObj<typeof CreateSessionModal>;

/** Step 1 — 템플릿 선택 (초기 상태) */
export const Step1_TemplateSelect: Story = {
  args: { initialStep: 1 },
};

/** Step 2 — 정보 입력 */
export const Step2_InfoInput: Story = {
  args: { initialStep: 2 },
};

/** Step 3 — AI & 보조자료 업로드 */
export const Step3_AIAndUpload: Story = {
  args: { initialStep: 3 },
};
