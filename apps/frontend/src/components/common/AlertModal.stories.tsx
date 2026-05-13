import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AlertModal } from './AlertModal';

const meta: Meta<typeof AlertModal> = {
  title: 'Common/AlertModal',
  component: AlertModal,
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
  },
};
export default meta;
type Story = StoryObj<typeof AlertModal>;

/** 기본 — 제목 + 설명 */
export const Default: Story = {
  args: {
    title: '저장이 완료되었습니다.',
    description: '변경 사항이 성공적으로 저장되었습니다.',
  },
};

/** 설명 없이 제목만 */
export const TitleOnly: Story = {
  args: {
    title: '요청이 처리되었습니다.',
  },
};

/** 오류 안내 */
export const ErrorNotice: Story = {
  args: {
    title: '오류가 발생했습니다.',
    description: '잠시 후 다시 시도해 주세요.',
    confirmLabel: '닫기',
  },
};

/** 확인 버튼 레이블 커스텀 */
export const CustomLabel: Story = {
  args: {
    title: '수업이 삭제되었습니다.',
    description: '해당 수업의 모든 데이터가 제거되었습니다.',
    confirmLabel: '알겠습니다',
  },
};
