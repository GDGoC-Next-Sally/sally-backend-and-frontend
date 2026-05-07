import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmModal } from './ConfirmModal';

const meta: Meta<typeof ConfirmModal> = {
  title: 'Common/ConfirmModal',
  component: ConfirmModal,
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
    onConfirm: { action: 'onConfirm' },
  },
};
export default meta;
type Story = StoryObj<typeof ConfirmModal>;

/** 피그마 기준 — 세션 종료 확인 */
export const Default: Story = {
  args: {
    title: '세션이 종료하시겠습니까?',
    description: '세션을 종료하면 학생들이 더 이상 참여할 수 없습니다.',
    cancelLabel: '취소',
    confirmLabel: '확인',
  },
};

/** 설명 텍스트 없는 단순 확인 */
export const NoDescription: Story = {
  args: {
    title: '정말 삭제하시겠습니까?',
    cancelLabel: '취소',
    confirmLabel: '삭제',
  },
};

/** 위험 동작 — 버튼 라벨 커스텀 */
export const Destructive: Story = {
  args: {
    title: '수업을 삭제하시겠습니까?',
    description: '삭제된 수업은 복구할 수 없습니다.',
    cancelLabel: '돌아가기',
    confirmLabel: '삭제하기',
  },
};

/** 확인 버튼 비활성화 상태 */
export const ConfirmDisabled: Story = {
  args: {
    title: '처리 중입니다…',
    description: '완료될 때까지 잠시 기다려주세요.',
    confirmDisabled: true,
  },
};

/** 빈 값 — title 만 있는 최소 구성 */
export const TitleOnly: Story = {
  args: {
    title: '저장하시겠습니까?',
  },
};
